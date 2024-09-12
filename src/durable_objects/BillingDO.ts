export class BillingDO {
  private state: DurableObjectState;
  private customerSessions: Map<string, { lastActive: number }>;
  private billingCycles: Map<string, { startDate: string, endDate: string }>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.customerSessions = new Map();
    this.billingCycles = new Map();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);

    switch (path[0]) {
      case 'session':
        return this.handleSession(request, path[1]);
      case 'billing-cycle':
        return this.handleBillingCycle(request, path[1]);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleSession(request: Request, customerId: string) {
    if (request.method === 'POST') {
      this.customerSessions.set(customerId, { lastActive: Date.now() });
      await this.state.storage.put(`session:${customerId}`, Date.now());
      return new Response('Session updated', { status: 200 });
    } else if (request.method === 'GET') {
      const session = this.customerSessions.get(customerId) || 
        { lastActive: await this.state.storage.get(`session:${customerId}`) };
      return new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('Method not allowed', { status: 405 });
  }

  private async handleBillingCycle(request: Request, customerId: string) {
    if (request.method === 'POST') {
      const data = await request.json() as { startDate: string; endDate: string };
      this.billingCycles.set(customerId, { startDate: data.startDate, endDate: data.endDate });
      await this.state.storage.put(`billing:${customerId}`, { startDate: data.startDate, endDate: data.endDate });
      return new Response('Billing cycle updated', { status: 200 });
    } else if (request.method === 'GET') {
      const cycle = this.billingCycles.get(customerId) || 
        await this.state.storage.get(`billing:${customerId}`);
      return new Response(JSON.stringify(cycle), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('Method not allowed', { status: 405 });
  }
}