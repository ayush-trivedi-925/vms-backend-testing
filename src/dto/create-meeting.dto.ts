import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  visitorFirstName: string;

  @IsString()
  @IsNotEmpty()
  visitorLastName: string;

  @IsString()
  @IsNotEmpty()
  visitorOrg: string;

  @IsString()
  @IsNotEmpty()
  visitorEmail: string;

  @IsString()
  @IsNotEmpty()
  reasonOfVisit: string;

  @IsString()
  @IsNotEmpty()
  host: string;
}
