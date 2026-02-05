import { Test, TestingModule } from '@nestjs/testing';
import { StaffService } from './staff.service';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../service/mail/mail.service';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

describe('StaffService', () => {
  let service: StaffService;

  const mockDatabaseService = {
    organization: {
      findUnique: jest.fn(),
    },
    staff: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    department: {
      findFirst: jest.fn(),
    },
    userCredential: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMailService = {
    StaffRegistration: jest.fn(),
    sendUserRegistrationMail: jest.fn(),
  };

  const txMock = {
    staff: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    department: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //--------------------------

  it('should add staff member successfully', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Acme Corp',
    });

    mockDatabaseService.staff.findFirst.mockResolvedValue(null);

    mockDatabaseService.$transaction.mockImplementation(async (cb) => {
      return cb({
        staff: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'staff-1',
            name: 'John',
            email: 'john@test.com',
            employeeCode: 'ACM1234',
            department: { name: 'HR' },
            organization: { name: 'Acme Corp' },
          }),
        },
      });
    });

    mockMailService.StaffRegistration.mockResolvedValue(undefined);

    const result = await service.addStaffMember('org-1', 'Admin', {
      name: 'John',
      email: 'JOHN@test.com',
      designation: 'Dev',
      departmentId: 'dep-1',
    });

    expect(result.success).toBe(true);
    expect(result.staffMemberDetails.name).toBe('John');
  });

  // ---------------------------

  it('should throw error if role is not allowed', async () => {
    await expect(
      service.addStaffMember('org-1', 'Staff', {
        name: 'John',
        email: 'JOHN@test.com',
        designation: 'Dev',
        departmentId: 'dep-1',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ---------------------------

  it('should throw error if organization does not exists', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue(null);
    await expect(
      service.addStaffMember('org-1', 'Admin', {
        name: 'John',
        email: 'JOHN@test.com',
        designation: 'Dev',
        departmentId: 'dep-1',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(mockDatabaseService.$transaction).not.toHaveBeenCalled();
  });

  it('should throw error if email already registered', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });

    mockDatabaseService.staff.findFirst.mockResolvedValue({
      id: 'emp-1',
      name: 'John',
      email: 'JOHN@test.com',
      designation: 'Dev',
      departmentId: 'dep-1',
      orgId: 'org-1',
    });

    await expect(
      service.addStaffMember('org-1', 'Admin', {
        name: 'John',
        email: 'JOHN@test.com',
        designation: 'Dev',
        departmentId: 'dep-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockDatabaseService.$transaction).not.toHaveBeenCalled();
  });

  // --------------------------------
  it('should add staff in bulk and throw mixed results', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'SegueVisit',
    });

    mockDatabaseService.$transaction.mockImplementation(async (cb) => {
      txMock.staff.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'staff-02' })
        .mockResolvedValue(null);

      txMock.department.findFirst
        .mockResolvedValueOnce({ id: 'dep-1', orgId: 'org-1' })
        .mockResolvedValueOnce(null);

      txMock.staff.create.mockResolvedValue({
        id: 'staff-1',
        name: 'John',
        email: 'john@gmail.com',
        department: { name: 'HR' },
      });
      return cb(txMock);
    });
    const result = await service.addStaffBulk('org-1', 'Admin', [
      {
        name: 'John',
        email: 'john@gmail.com',
        designation: 'QA',
        departmentId: 'HR',
      },
      {
        name: 'Dave',
        email: 'dev@gmail.com',
        designation: 'Developer',
        departmentId: 'Developement',
      },
      {
        name: 'Mike',
        email: 'mike@test.com',
        designation: 'Ops',
        departmentId: 'Finance',
      },
    ]);

    expect(result.success).toBe(true);
    expect(result.failed).toBe(2);
    expect(result.imported).toBe(1);
    expect(result.details).toHaveLength(3);
  });

  // --------------------------------
  it('should throw error if role is not allowed', async () => {
    await expect(
      service.addStaffBulk('org-1', 'Staff', [
        {
          name: 'John',
          email: 'john@gmail.com',
          designation: 'QA',
          departmentId: 'HR',
        },
        {
          name: 'Dave',
          email: 'dev@gmail.com',
          designation: 'Developer',
          departmentId: 'Developement',
        },
        {
          name: 'Mike',
          email: 'mike@test.com',
          designation: 'Ops',
          departmentId: 'Finance',
        },
      ]),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ---------------------------------
  it('should throw error if organization does not exists', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.addStaffBulk('org-1', 'Admin', [
        {
          name: 'John',
          email: 'john@gmail.com',
          designation: 'QA',
          departmentId: 'HR',
        },
        {
          name: 'Dave',
          email: 'dev@gmail.com',
          designation: 'Developer',
          departmentId: 'Developement',
        },
        {
          name: 'Mike',
          email: 'mike@test.com',
          designation: 'Ops',
          departmentId: 'Finance',
        },
      ]),
    ).rejects.toThrow(NotFoundException);
  });

  // --------------------------------
  it('should not add duplicate staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'SegueVisit',
    });

    mockDatabaseService.$transaction.mockImplementation(async (cb) => {
      txMock.staff.findFirst
        .mockResolvedValueOnce({ id: 'staff-01' })
        .mockResolvedValueOnce({ id: 'staff-02' })
        .mockResolvedValue({ id: 'staff-03' });

      return cb(txMock);
    });
    const result = await service.addStaffBulk('org-1', 'Admin', [
      {
        name: 'John',
        email: 'john@gmail.com',
        designation: 'QA',
        departmentId: 'HR',
      },
      {
        name: 'Dave',
        email: 'dev@gmail.com',
        designation: 'Developer',
        departmentId: 'Developement',
      },
      {
        name: 'Mike',
        email: 'mike@test.com',
        designation: 'Ops',
        departmentId: 'Finance',
      },
    ]);

    expect(result.success).toBe(true);
    expect(result.failed).toBe(3);
    expect(result.imported).toBe(0);
    expect(result.details).toHaveLength(3);
  });

  // ----------------
  it('should throw error if role is not allowed', async () => {
    await expect(
      service.getAllStaffMemberDetails('org-1', 'Staff'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ---------------------------------
  it('should throw error if organization does not exists', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.getAllStaffMemberDetails('org-1', 'Admin'),
    ).rejects.toThrow(NotFoundException);
  });

  // ----------------------------------
  it('should return message if no staff member exists', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });
    mockDatabaseService.staff.findMany.mockResolvedValue([]);
    const result = await service.getAllStaffMemberDetails('org-1', 'Admin');
    expect(result.success).toBe(true);
    expect(result.message).toBe(
      'There is no staff in this organization currently.',
    );
  });

  // -------------------------------
  it('should return staff details', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'SegueVisit',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'emp-1',
      name: 'John Doe',
      orgId: 'org-1',
    });

    const result = await service.getStaffMemberDetails(
      'org-1',
      'Admin',
      'emp-1',
      'staff-1',
    );

    expect(result.success).toBe(true);
    expect(result.staffDetails.id).toBe('emp-1');
    expect(result.staffDetails.name).toBe('John Doe');
  });

  // ----------------------------------------
  it('should throw error if role is not allowed', async () => {
    await expect(
      service.getStaffMemberDetails('org-1', 'Staff', 'emp-1', 'user-1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // -----------------------------------
  it('should throw error if organization does not exist', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.getStaffMemberDetails('org-1', 'Admin', 'emp-1', 'user-1'),
    ).rejects.toThrow(NotFoundException);

    expect(mockDatabaseService.staff.findUnique).not.toHaveBeenCalled();
  });

  // -----------------------------------
  it('should throw error if staff does not exist', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue(null);

    await expect(
      service.getStaffMemberDetails('org-1', 'Admin', 'emp-1', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  // ---------------------------------------
  it('should throw error if staff belongs to a different organization', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'emp-1',
      orgId: 'org-2',
    });

    await expect(
      service.getStaffMemberDetails('org-1', 'Admin', 'emp-1', 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  // -----------------------------------------
  it('should return staff details using userId', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'SegueVisit',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'emp-1',
      name: 'John Doe',
      orgId: 'org-1',
      userId: 'user-1',
    });

    const result = await service.getStaffMemberDetailsUserId(
      'org-1',
      'Admin',
      'user-1',
    );

    expect(result.success).toBe(true);
    expect(result.staffDetails.id).toBe('emp-1');
    expect(result.staffDetails.name).toBe('John Doe');
  });

  // ------------------------------
  it('should throw error if role is not allowed', async () => {
    await expect(
      service.getStaffMemberDetailsUserId('org-1', 'staff', 'user-1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ------------------------------
  it('should throw error if organization does not exists', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue(null);

    await expect(
      service.getStaffMemberDetailsUserId('org-1', 'Admin', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  // ---------------------------------
  it('should throw error if role is not allowed - edit staff', async () => {
    await expect(
      service.editStaffMemberDetails('org-1', 'staff', 'staff-1', {
        name: 'John',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ---------------------------------

  it('should throw error if organization does not exists - edit staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue(null);
    await expect(
      service.editStaffMemberDetails('org-1', 'Admin', 'staff-1', {
        name: 'John',
      }),
    ).rejects.toThrow(NotFoundException);
  });
  // ---------------------------------
  it('should throw error if staff does not exists - edit staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });
    mockDatabaseService.staff.findUnique.mockResolvedValue(null);
    await expect(
      service.editStaffMemberDetails('org-1', 'Admin', 'staff-1', {
        name: 'John',
      }),
    ).rejects.toThrow(NotFoundException);
  });
  // ---------------------------------
  it('should throw error if organization belongs to different organization - edit staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-2',
    });
    await expect(
      service.editStaffMemberDetails('org-1', 'Admin', 'staff-1', {
        name: 'John',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ------------------------------------

  it('should staff and user when staff has userId - edit staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'orgId',
    });
    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-1',
      role: 'Staff',
      userId: 'user-1',
    });

    const result = await service.editStaffMemberDetails(
      'org-1',
      'Admin',
      'staff-1',
      { name: 'John', email: 'john@gmail.com' },
    );

    expect(result.success).toBe(true);
    expect(mockDatabaseService.staff.update).toHaveBeenCalled();
    expect(mockDatabaseService.userCredential.update).toHaveBeenCalled();
  });
  // ---------------------------------
  it('should demote existing superadmin when promoting another - edit staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-2',
      orgId: 'org-1',
      role: 'Admin',
      userId: 'user-2',
    });

    mockDatabaseService.userCredential.findFirst.mockResolvedValue({
      id: 'user-1',
      staff: { id: 'staff-1' },
    });

    const result = await service.editStaffMemberDetails(
      'org-1',
      'SuperAdmin',
      'staff-2',
      { role: 'SuperAdmin' } as any,
    );

    expect(result.success).toBe(true);
    expect(mockDatabaseService.userCredential.update).toHaveBeenCalled();
    expect(mockDatabaseService.staff.update).toHaveBeenCalled();
  });

  // ---------------------------
  it('should disable account when admin is demoted to staff - edit staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-1',
      role: 'Admin',
      userId: 'user-1',
    });

    await service.editStaffMemberDetails('org-1', 'Admin', 'staff-1', {
      role: 'Staff',
    } as any);

    expect(mockDatabaseService.userCredential.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { accountStatus: 'Disabled' },
      }),
    );
  });

  // ----------------------------------
  it('should create user and send mail when staff has no userId - edit staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'SegueVisit',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-1',
      role: 'Staff',
      email: 'john@test.com',
      userId: null,
    });

    const result = await service.editStaffMemberDetails(
      'org-1',
      'Admin',
      'staff-1',
      { role: 'Admin', email: 'john@test.com' } as any,
    );

    expect(result.success).toBe(true);
    expect(mockDatabaseService.userCredential.create).toHaveBeenCalled();
    expect(mockMailService.sendUserRegistrationMail).toHaveBeenCalled();
  });

  // --------------------------------
  it('should throw error if role is not allowed - delete staff', async () => {
    await expect(
      service.deleteStaffMember('org-1', 'staff', 'staff-1'),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockDatabaseService.staff.delete).not.toHaveBeenCalled();
  });

  // ---------------------------------
  it('should throw error if organization does not exists - delete staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue(null);
    await expect(
      service.deleteStaffMember('org-1', 'Admin', 'staff-1'),
    ).rejects.toThrow(NotFoundException);
    expect(mockDatabaseService.staff.delete).not.toHaveBeenCalled();
  });

  // ---------------------------------
  it('should throw error if staff does not exists - delete staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });
    mockDatabaseService.staff.findUnique.mockResolvedValue(null);
    await expect(
      service.deleteStaffMember('org-1', 'Admin', 'staff-1'),
    ).rejects.toThrow(NotFoundException);
    expect(mockDatabaseService.staff.delete).not.toHaveBeenCalled();
  });

  // ------------------------------
  it('should not throw error if role is Root and staff belongs to different org', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });
    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-2',
      role: 'Staff',
    });

    const result = await service.deleteStaffMember('org-1', 'Root', 'staff-1');

    expect(result.success).toBe(true);
    expect(mockDatabaseService.staff.delete).toHaveBeenCalled();
  });

  // -----------------------------
  it('should throw error if Admin tries to delete admin - delete staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });
    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-1',
      role: 'Admin',
    });

    await expect(
      service.deleteStaffMember('org-1', 'Admin', 'staff-1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // --------------------------------
  it('should throw error if Admin tries to delete superadmin - delete staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });
    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-1',
      role: 'SuperAdmin',
    });

    await expect(
      service.deleteStaffMember('org-1', 'Admin', 'staff-1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ---------------------------------
  it('should throw error if SuperAdmin tries to delete Admin - delete staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });
    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-1',
      role: 'Staff',
      userId: 'user-1',
    });

    const result = await service.deleteStaffMember('org-1', 'Admin', 'staff-1');

    expect(result.success).toBe(true);
    expect(mockDatabaseService.staff.delete).toHaveBeenCalled();
    expect(mockDatabaseService.userCredential.delete).toHaveBeenCalled();
  });

  // -------------------------------------
  it('should allow Admin to delete Staff - delete staff', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });

    mockDatabaseService.staff.findUnique.mockResolvedValue({
      id: 'staff-1',
      orgId: 'org-1',
      role: 'Staff',
    });

    const result = await service.deleteStaffMember('org-1', 'Admin', 'staff-1');

    expect(result.success).toBe(true);
    expect(mockDatabaseService.staff.delete).toHaveBeenCalled();
  });
});
