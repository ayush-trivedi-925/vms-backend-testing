import { IsNotEmpty, IsString } from 'class-validator';

export class AddReasonDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
