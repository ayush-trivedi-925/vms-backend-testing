import { IsOptional, IsString } from 'class-validator';

export class EditTeamDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  masterManagerId: string;
}
