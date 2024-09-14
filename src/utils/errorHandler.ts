export class AppError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export function handleError(error: unknown): Response {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}