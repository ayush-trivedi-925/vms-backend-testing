import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptVisitDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RejectVisitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
