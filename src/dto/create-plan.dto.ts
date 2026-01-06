import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BillingCycle, FeatureCode } from '@prisma/client';
import { Type } from 'class-transformer';
import { PlanFeatureDto } from './plan-feature.dto';
export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsInt()
  price: number;

  @ValidateNested({ each: true })
  @Type(() => PlanFeatureDto)
  features: PlanFeatureDto[];
}
