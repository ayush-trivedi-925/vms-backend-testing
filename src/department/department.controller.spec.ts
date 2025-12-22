import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { AuthGuard } from 'src/guard/auth.guard';
import { BadRequestException } from '@nestjs/common';

describe('DepartmentController', () => {
  let controller: DepartmentController;

  const mockDepartmentService = {
    createDepartment: jest.fn(),
    addDepartmentBulk: jest.fn(),
    getAllDepartments: jest.fn(),
    deleteDepartment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartmentController],
      providers: [
        {
          provide: DepartmentService,
          useValue: mockDepartmentService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn(() => true), //  allow all requests
      })
      .compile();

    controller = module.get<DepartmentController>(DepartmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ------------------------
  it('should call createDepartment service method', async () => {
    const mockReq = {
      orgId: 'org-1',
      userId: 'user-1',
      role: 'Admin',
    };

    const dto = { name: 'HR' };

    mockDepartmentService.createDepartment.mockResolvedValue({
      success: true,
    });

    const result = await controller.CreateDepartment(mockReq, dto, undefined);

    expect(mockDepartmentService.createDepartment).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'Admin',
      dto,
      null,
    );

    expect(result.success).toBe(true);
  });

  // ---------------------

  it('should throw error if department list is empty', async () => {
    const mockReq = {
      orgId: 'org-1',
      role: 'Admin',
    };

    await expect(controller.addReasonBulk(mockReq, [])).rejects.toThrow(
      BadRequestException,
    );
  });

  // ---------------------------

  it('should call addDepartmentBulk service method', async () => {
    const mockReq = {
      orgId: 'org-1',
      role: 'Admin',
    };

    const list = [{ name: 'HR' }];

    mockDepartmentService.addDepartmentBulk.mockResolvedValue({
      success: true,
    });

    const result = await controller.addReasonBulk(mockReq, list);

    expect(mockDepartmentService.addDepartmentBulk).toHaveBeenCalledWith(
      'org-1',
      'Admin',
      list,
      null,
    );

    expect(result.success).toBe(true);
  });

  // ---------------------------

  it('should call getAllDepartments service method', async () => {
    const mockReq = {
      orgId: 'org-1',
      userId: 'user-1',
      role: 'Admin',
    };

    mockDepartmentService.getAllDepartments.mockResolvedValue({
      success: true,
    });

    const result = await controller.getAllDepartments(mockReq, 'name', 'asc');

    expect(mockDepartmentService.getAllDepartments).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'Admin',
      'name',
      'asc',
      null,
    );

    expect(result.success).toBe(true);
  });

  // ----------------
  it('should call deleteDepartment service method', async () => {
    const mockReq = {
      orgId: 'org-1',
      userId: 'user-1',
      role: 'SuperAdmin',
    };

    mockDepartmentService.deleteDepartment.mockResolvedValue({
      success: true,
    });

    const result = await controller.deleteDepartment(mockReq, 'dep-1');

    expect(mockDepartmentService.deleteDepartment).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      'SuperAdmin',
      'dep-1',
      null,
    );

    expect(result.success).toBe(true);
  });
});
