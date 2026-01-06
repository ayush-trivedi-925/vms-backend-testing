import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ROLE_KEY = 'required_role';

export const RequiredRole = (role: string) =>
  SetMetadata(REQUIRED_ROLE_KEY, role);
