import { Request } from 'express';
import { UserRole } from '@secure-cbt/shared';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    username: string;
    role: UserRole;
  };
}
