import { Test, TestingModule } from '@nestjs/testing';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { AuthGuard } from 'src/guard/auth.guard';

describe('StaffController', () => {
  let controller: StaffController;

  const mockStaffService = {
    addStaffMember: jest.fn(),
    addStaffBulk: jest.fn(),
    getSuperAdminDetails: jest.fn(),
    getAllStaffMemberDetails: jest.fn(),
    getStaffMemberDetailsUserId: jest.fn(),
    getStaffMemberDetails: jest.fn(),
    editStaffMemberDetails: jest.fn(),
    deleteStaffMember: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [
        {
          provide: StaffService,
          useValue: mockStaffService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<StaffController>(StaffController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ------------------
});
