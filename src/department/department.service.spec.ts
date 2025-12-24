import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentService } from './department.service';
import { DatabaseService } from 'src/database/database.service';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

describe('DepartmentService', () => {
  let service: DepartmentService;
  const mockDatabaseService = {
    userCredential: {
      findUnique: jest.fn(),
    },
    department: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    staff: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------
  it('should create a department successfully', async () => {
    mockDatabaseService.userCredential.findUnique.mockResolvedValue({
      id: 'user-1',
      orgId: 'org-1',
    });

    mockDatabaseService.department.findFirst.mockResolvedValue(null);

    mockDatabaseService.department.create.mockResolvedValue({
      id: 'dep-1',
      name: 'HR',
      orgId: 'org-1',
    });

    const result = await service.createDepartment('org-1', 'user-1', 'Admin', {
      name: 'HR',
    });

    expect(result.success).toBe(true);
    expect(result.departmentInfo.name).toBe('HR');
    expect(mockDatabaseService.department.create).toHaveBeenCalledWith({
      data: {
        orgId: 'org-1',
        name: 'HR',
      },
    });
  });

  // -------------
  it('should throw error if department already exists', async () => {
    mockDatabaseService.userCredential.findUnique.mockResolvedValue({
      orgId: 'org-1',
      id: 'user-1',
    });

    mockDatabaseService.department.findFirst.mockResolvedValue({
      id: 'dep-1',
      name: 'HR',
      orgId: 'org-1',
    });

    await expect(
      service.createDepartment('org-1', 'user-1', 'Admin', { name: 'HR' }),
    ).rejects.toThrow(BadRequestException);
  });

  // -----------------
  it('should throw error if role is not valid', async () => {
    await expect(
      service.createDepartment('org-1', 'user-1', 'Staff', { name: 'HR' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // -------------------
  it('should return all departments with staff count', async () => {
    mockDatabaseService.userCredential.findUnique.mockResolvedValue({
      orgId: 'org-1',
      id: 'user-1',
    });
    mockDatabaseService.department.findMany.mockResolvedValue([
      {
        id: 'dep-1',
        name: 'HR',
        orgId: 'org-1',
        createAt: new Date(),
      },
      {
        id: 'dep-2',
        name: 'IT',
        orgId: 'org-1',
        createAt: new Date(),
      },
    ]);

    mockDatabaseService.staff.groupBy.mockResolvedValue([
      {
        departmentId: 'dep-1',
        _count: { departmentId: 3 },
      },
      { departmentId: 'dep-2', _count: { departmentId: 1 } },
    ]);

    const result = await service.getAllDepartments(
      'org-1',
      'user-1',
      'SuperAdmin',
    );
    expect(result.success).toBe(true);
    expect(result.allDepartments).toHaveLength(2);
    expect(result.allDepartments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'dep-1', staffCount: 3 }),
        expect.objectContaining({ id: 'dep-2', staffCount: 1 }),
      ]),
    );
    expect(mockDatabaseService.department.findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  // ----------------
  it('should return message when no departments exist', async () => {
    mockDatabaseService.userCredential.findUnique.mockResolvedValue({
      id: 'user-1',
      orgId: 'org-1',
    });

    mockDatabaseService.department.findMany.mockResolvedValue([]);

    const result = await service.getAllDepartments('org-1', 'user-1', 'Admin');

    expect(result.success).toBe(true);
    expect(result.message).toBe('No departments as of now.');
  });

  // -----------------
  it('should throw error if role is not valid', async () => {
    await expect(
      service.getAllDepartments('org-1', 'user-1', 'Staff'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ---------------------
  it('should add departments in bulk and return mixed results', async () => {
    mockDatabaseService.organization.findUnique.mockResolvedValue({
      id: 'org-1',
    });

    mockDatabaseService.department.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'dep-1',
        name: 'HR',
        orgId: 'org-1',
      });

    mockDatabaseService.department.create.mockResolvedValue({
      id: 'dep-2',
      name: 'IT',
      orgId: 'org-1',
    });
    const result = await service.addDepartmentBulk(
      'org-1',
      'Admin',
      [{ name: 'IT' }, { name: 'HR' }],
      null,
    );

    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
    expect(result.details).toHaveLength(2);

    expect(result.details[0].success).toBe(true);
    expect(result.details[1].success).toBe(false);
  });

  // ------------------
  it('should throw error if role is not allowed in bulk add', async () => {
    await expect(
      service.addDepartmentBulk('org-1', 'Staff', [{ name: 'HR' }], null),
    ).rejects.toThrow(UnauthorizedException);
  });

  // -------------------
  it('should delete department successfully', async () => {
    mockDatabaseService.userCredential.findUnique.mockResolvedValue({
      orgId: 'org-1',
      id: 'user-1',
    });

    mockDatabaseService.department.findUnique.mockResolvedValue({
      id: 'dep-1',
      orgId: 'org-1',
    });

    mockDatabaseService.department.delete.mockResolvedValue({
      id: 'dep-1',
    });

    const result = await service.deleteDepartment(
      'org-1',
      'user-1',
      'SuperAdmin',
      'dep-1',
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe('Department deleted successfully.');
    expect(mockDatabaseService.department.delete).toHaveBeenCalledWith({
      where: { id: 'dep-1' },
    });
  });

  // -------------------------
  it('should throw error if department does not exists', async () => {
    mockDatabaseService.userCredential.findUnique.mockResolvedValue({
      orgId: 'org-1',
      id: 'user-1',
    });

    mockDatabaseService.department.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteDepartment('org-1', 'user-1', 'SuperAdmin', 'dep-1'),
    ).rejects.toThrow(NotFoundException);

    expect(mockDatabaseService.department.delete).not.toHaveBeenCalled();
  });

  // ------------------
  it('should throw error if role not allowed', async () => {
    await expect(
      service.deleteDepartment('org-1', 'user-1', 'Admin', 'dep-1'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
