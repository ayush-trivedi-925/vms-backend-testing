import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class StartVisitDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  visitorOrganization: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  reasonOfVisit: string;

  @IsString()
  @IsNotEmpty()
  staffId: string;
}
