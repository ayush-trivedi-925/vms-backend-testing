import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  reasonId: string;

  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsOptional()
  @IsString()
  checkInPicture: string;
}
