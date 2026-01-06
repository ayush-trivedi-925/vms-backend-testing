import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { FeatureCode } from '@prisma/client';

export class PlanFeatureDto {
  @IsEnum(FeatureCode)
  feature: FeatureCode;

  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number | null;
}
