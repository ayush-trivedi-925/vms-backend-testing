import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EndVisitDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
