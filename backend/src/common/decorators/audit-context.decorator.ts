import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuditContext } from '../../audit/audit.service';
import { AuthUser } from '../types/auth-user.types';
import { getClientIp } from '../utils/request.util';

export function extractAuditContext(_data: unknown, ctx: ExecutionContext): AuditContext {
  const req = ctx.switchToHttp().getRequest<Request>();
  return { userId: (req.user as AuthUser | undefined)?.id, ip: getClientIp(req) };
}

export const AuditCtx = createParamDecorator(extractAuditContext);
