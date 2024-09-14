import { verifyJWT } from '../utils/jwtUtils';
import { Env } from '../types/env';

// Add this at the top of the file
declare global {
  interface Request {
    customerId?: string;
    email?: string;
    roles?: string[];
  }
}

export async function authMiddleware(request: Request, env: Env): Promise<Response | void> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Invalid or missing Authorization header', { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const payload = await verifyJWT(token, env.JWT_SECRET);

  if (!payload) {
    return new Response('Invalid token', { status: 401 });
  }

  console.log({ payload: JSON.stringify(payload) });

  // Add customerId, email, and roles to the request
  request.customerId = payload.customerId;
  request.email = payload.email;
  request.roles = payload.roles;
}