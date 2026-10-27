import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../types/auth-user.types';

export function extractCurrentUser(_data: unknown, ctx: ExecutionContext): AuthUser | undefined {
  return ctx.switchToHttp().getRequest<Request>().user as AuthUser | undefined;
}

export const CurrentUser = createParamDecorator(extractCurrentUser);
