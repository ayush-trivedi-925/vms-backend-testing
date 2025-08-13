import { IsEmpty, IsString } from 'class-validator';

export class EndMeetingDto {
  @IsString()
  @IsEmpty()
  visitorFirstName: string;

  @IsString()
  @IsEmpty()
  visitorLastName: string;
}
