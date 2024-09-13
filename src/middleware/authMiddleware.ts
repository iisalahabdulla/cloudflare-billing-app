import { verifyJWT } from '../utils/jwtUtils';
import { Env } from '../types/env';

export async function authMiddleware(request: Request, env: Env): Promise<{ customerId: string; email: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid or missing Authorization header');
  }

  const token = authHeader.split(' ')[1];
  const payload = await verifyJWT(token, env.JWT_SECRET);

  if (!payload) {
    throw new Error('Invalid token');
  }

  return payload;
}