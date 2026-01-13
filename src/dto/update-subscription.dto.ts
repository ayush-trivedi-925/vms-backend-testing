import { IsDateString, IsString } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsString()
  planId: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;
}
