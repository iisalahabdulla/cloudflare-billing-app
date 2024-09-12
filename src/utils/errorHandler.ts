export class AppError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    return new Response(error.message, { status: error.status });
  }
  console.error('Unhandled error:', error);
  return new Response('Internal Server Error', { status: 500 });
}