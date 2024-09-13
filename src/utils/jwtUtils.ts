import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key'; // In production, use an environment variable

const encoder = new TextEncoder();

async function generateSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function generateJWT(payload: { customerId: string; email: string }, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }));
  const signatureInput = `${header}.${encodedPayload}`;
  const signature = await generateSignature(signatureInput, secret);
  return `${signatureInput}.${signature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<{ customerId: string; email: string } | null> {
  const [header, payload, signature] = token.split('.');
  const signatureInput = `${header}.${payload}`;
  const expectedSignature = await generateSignature(signatureInput, secret);
  
  if (signature !== expectedSignature) {
    return null;
  }

  const decodedPayload = JSON.parse(atob(payload));
  if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { customerId: decodedPayload.customerId, email: decodedPayload.email };
}