export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Subscription Management API',
    version: '1.0.0',
    description: 'API for managing subscriptions, customers, and billing',
  },
  paths: {
    '/customer': {
      get: {
        summary: 'Get customer details',
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Customer' },
              },
            },
          },
          '404': { description: 'Customer not found' },
        },
      },
      post: {
        summary: 'Create or update customer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Customer' },
            },
          },
        },
        responses: {
          '200': { description: 'Customer created or updated successfully' },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/customer/{id}/subscription': {
      get: {
        summary: 'Get customer subscription details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Subscription' },
              },
            },
          },
          '404': { description: 'Customer or subscription not found' },
        },
      },
    },
    '/subscription': {
      get: {
        summary: 'Get subscription details',
        parameters: [
          {
            name: 'customerId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Subscription' },
              },
            },
          },
          '404': { description: 'Subscription not found' },
        },
      },
      post: {
        summary: 'Create subscription',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Subscription' },
            },
          },
        },
        responses: {
          '201': { description: 'Subscription created successfully' },
          '400': { description: 'Invalid input' },
        },
      },
      put: {
        summary: 'Update subscription',
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Subscription' },
            },
          },
        },
        responses: {
          '200': { description: 'Subscription updated successfully' },
          '400': { description: 'Invalid input' },
          '404': { description: 'Subscription not found' },
        },
      },
      delete: {
        summary: 'Cancel subscription',
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Subscription cancelled successfully' },
          '404': { description: 'Subscription not found' },
        },
      },
    },
    '/invoice': {
      get: {
        summary: 'Get invoice details',
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Invoice' },
              },
            },
          },
          '404': { description: 'Invoice not found' },
        },
      },
      post: {
        summary: 'Generate invoice',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InvoiceGeneration' },
            },
          },
        },
        responses: {
          '201': { 
            description: 'Invoice generated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Invoice' },
              },
            },
          },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/subscription-plan': {
      get: {
        summary: 'Get subscription plan details',
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SubscriptionPlan' },
              },
            },
          },
          '404': { description: 'Subscription plan not found' },
        },
      },
      post: {
        summary: 'Create subscription plan',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubscriptionPlan' },
            },
          },
        },
        responses: {
          '201': { description: 'Subscription plan created successfully' },
          '400': { description: 'Invalid input' },
        },
      },
      put: {
        summary: 'Update subscription plan',
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubscriptionPlan' },
            },
          },
        },
        responses: {
          '200': { description: 'Subscription plan updated successfully' },
          '400': { description: 'Invalid input' },
          '404': { description: 'Subscription plan not found' },
        },
      },
    },
    '/payment': {
      post: {
        summary: 'Process payment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Payment' },
            },
          },
        },
        responses: {
          '200': { description: 'Payment processed successfully' },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/billing': {
      post: {
        summary: 'Generate invoice for a specific customer',
        parameters: [
          {
            name: 'customerId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Invoice generated successfully' },
          '400': { description: 'Invalid input' },
          '404': { description: 'Customer not found' },
        },
      },
      get: {
        summary: 'Run billing process for all customers or a specific customer',
        parameters: [
          {
            name: 'customerId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Billing process completed successfully' },
          '400': { description: 'Invalid input' },
        },
      },
    },
  },
  components: {
    schemas: {
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          subscription_plan_id: { type: 'string', nullable: true },
          subscription_status: { type: 'string', enum: ['active', 'inactive', 'pending', 'cancelled'] },
          subscription_start_date: { type: 'string', format: 'date-time', nullable: true },
          subscription_end_date: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['id', 'name', 'email'],
      },
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customer_id: { type: 'string' },
          plan_id: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'pending', 'cancelled'] },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['id', 'customer_id', 'plan_id', 'status', 'start_date'],
      },
      SubscriptionPlan: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          billing_cycle: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'] },
          features: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
        required: ['id', 'name', 'price', 'billing_cycle', 'status'],
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customer_id: { type: 'string' },
          amount: { type: 'number' },
          due_date: { type: 'string', format: 'date-time' },
          payment_status: { type: 'string', enum: ['pending', 'paid', 'overdue'] },
          payment_date: { type: 'string', format: 'date-time', nullable: true },
        },
        required: ['id', 'customer_id', 'amount', 'due_date', 'payment_status'],
      },
      InvoiceGeneration: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          amount: { type: 'number' },
          due_date: { type: 'string', format: 'date-time' },
        },
        required: ['customer_id', 'amount', 'due_date'],
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          invoice_id: { type: 'string' },
          customer_id: { type: 'string' },
          amount: { type: 'number' },
          payment_method: { type: 'string', enum: ['credit_card', 'bank_transfer', 'paypal', 'other'] },
          payment_date: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['success', 'failed', 'pending'] },
        },
        required: ['id', 'invoice_id', 'customer_id', 'amount', 'payment_method', 'payment_date', 'status'],
      },
    },
  },
};