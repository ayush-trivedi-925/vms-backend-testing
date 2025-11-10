import { Matches, MaxLength, MinLength } from 'class-validator';

export class EditSystemUserDto {
  @MinLength(4, { message: 'Code should be 4 digits long' })
  @MaxLength(4, { message: 'Code should be 4 digits long' })
  @Matches(/^\d{4}$/, { message: 'Code should only contain numbers' })
  secretCode: string;
}
