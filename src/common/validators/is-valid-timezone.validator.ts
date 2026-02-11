import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { DateTime } from 'luxon';

@ValidatorConstraint({ name: 'isValidTimezone', async: false })
export class IsValidTimezone implements ValidatorConstraintInterface {
  validate(value: string) {
    return DateTime.now().setZone(value).isValid;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Invalid timezone. Must be a valid IANA timezone like Asia/Dubai.';
  }
}
