import { Env } from '../types/env';

export function roleMiddleware(requiredRoles: string[]) {
  return (request: Request, env: Env): Response | void => {
    const userRoles = request.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return new Response('Forbidden', { status: 403 });
    }
  };
}