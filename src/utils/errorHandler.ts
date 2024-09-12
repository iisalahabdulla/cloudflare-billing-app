export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function handleError(error: unknown): Response {
  console.error(error);

  if (error instanceof AppError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (error instanceof Error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown Error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}