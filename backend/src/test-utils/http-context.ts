import { ExecutionContext } from '@nestjs/common';

export function httpContext(
  req: Record<string, unknown> = {},
  res: Record<string, unknown> = {},
  type = 'http',
): ExecutionContext {
  return {
    getType: () => type,
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res, getNext: () => undefined }),
  } as unknown as ExecutionContext;
}
