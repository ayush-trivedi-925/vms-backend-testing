import { Test, TestingModule } from '@nestjs/testing';
import { StaffMemberController } from './staff-member.controller';

describe('StaffMemberController', () => {
  let controller: StaffMemberController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffMemberController],
    }).compile();

    controller = module.get<StaffMemberController>(StaffMemberController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
