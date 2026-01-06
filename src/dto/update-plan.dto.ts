import { BillingCycle } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { UpdatePlanFeatureDto } from './update-plan-features.dto';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdatePlanFeatureDto)
  @ArrayMinSize(1)
  features?: UpdatePlanFeatureDto[];
}
