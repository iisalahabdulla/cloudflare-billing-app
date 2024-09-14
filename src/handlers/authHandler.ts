import { KVService } from '../services/kvService';
import { Customer } from '../models/customer';
import { generateJWT, verifyJWT } from '../utils/jwtUtils';
import bcrypt from 'bcryptjs';
import { Env } from '../types/env';

export async function handleAuth(request: Request, kvService: KVService, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.split('/').pop();

  try {
    switch (path) {
      case 'register':
        return await handleRegister(request, kvService, env);
      case 'login':
        return await handleLogin(request, kvService, env);
      default:
        return new Response('Invalid auth endpoint', { status: 404 });
    }
  } catch (error) {
    console.error('Error in handleAuth:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleRegister(request: Request, kvService: KVService, env: Env): Promise<Response> {
  try {
    const { name, email, password } = await request.json() as { name: string; email: string; password: string };

    if (!name || !email || !password) {
      return new Response('Name, email, and password are required', { status: 400 });
    }

    console.log('Checking for existing customer');
    const existingCustomer = await kvService.getCustomerByEmail(email);
    if (existingCustomer) {
      console.log('Existing customer found');
      return new Response('Email already registered', { status: 400 });
    }

    console.log('Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newCustomer: Customer = {
      id: `CUS-${Date.now()}`,
      name,
      email,
      password: hashedPassword,
      subscription_plan_id: null,
      subscription_status: 'inactive',
      subscription_start_date: null,
      subscription_end_date: null,
      roles: ['customer'], // Add default role
    };

    console.log('Setting new customer');
    await kvService.setCustomer(newCustomer);

    console.log('Generating JWT');
    const token = await generateJWT({ customerId: newCustomer.id, email: newCustomer.email, roles: newCustomer.roles ?? [] }, env.JWT_SECRET);

    return new Response(JSON.stringify({ token }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handleRegister:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleLogin(request: Request, kvService: KVService, env: Env): Promise<Response> {
  const { email, password } = await request.json() as { email: string; password: string };

  if (!email || !password) {
    return new Response('Email and password are required', { status: 400 });
  }

  const customer = await kvService.getCustomerByEmail(email);
  if (!customer) {
    return new Response('Invalid credentials', { status: 401 });
  }
  if (!customer.password) {
    return new Response('Password is not set', { status: 401 });
  }

  const isPasswordValid = await bcrypt.compare(password, customer.password);
  if (!isPasswordValid) {
    return new Response('Invalid credentials', { status: 401 });
  }

  const token = await generateJWT({ customerId: customer.id, email: customer.email, roles: customer.roles ?? [] }, env.JWT_SECRET);

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}