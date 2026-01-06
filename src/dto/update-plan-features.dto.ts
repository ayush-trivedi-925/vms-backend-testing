import { FeatureCode } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePlanFeatureDto {
  @IsEnum(FeatureCode)
  feature: FeatureCode;

  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number | null;
}
