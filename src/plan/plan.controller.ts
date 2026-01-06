import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto } from 'src/dto/create-plan.dto';
import { AuthGuard } from 'src/guard/auth.guard';
import { UserRoleGuard } from 'src/guard/user-role.guard';
import { RequiredRole } from 'src/decorators/required-role.decorator';
import { UpdatePlanDto } from 'src/dto/update-plan.dto';

@UseGuards(AuthGuard, UserRoleGuard)
@RequiredRole('Root')
@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post('')
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.planService.createPlan(dto);
  }

  @Get('')
  async getAllPlans() {
    return this.planService.getAllPlans();
  }

  @Get(':planId')
  async getPlanDetails(@Param('planId') planId: string) {
    return this.planService.getPlanDetails(planId);
  }

  @Put(':planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.planService.updatePlan(planId, dto);
  }

  @Delete(':planId')
  async softDeletePlan(@Param('planId') planId: string) {
    return this.planService.softDeletePlan(planId);
  }
}
