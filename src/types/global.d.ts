import '@cloudflare/workers-types';

declare global {
  interface KVNamespaceListResult<T, K> {
    cursor?: string;
  }
}