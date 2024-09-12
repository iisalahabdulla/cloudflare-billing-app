export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Billing System API',
    version: '1.0.0',
    description: 'API for managing subscriptions, customers, billing, and payments',
  },
  paths: {
    '/customer': {
      get: {
        summary: 'Get Customer Subscription Details',
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'subscription',
            in: 'query',
            required: true,
            schema: { type: 'boolean' },
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
      post: {
        summary: 'Create/Update Customer',
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
              schema: { $ref: '#/components/schemas/CustomerInput' },
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
        summary: 'Get Customer Subscription Details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'subscription',
            in: 'query',
            required: true,
            schema: { type: 'boolean' },
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
    '/subscription-plan': {
      get: {
        summary: 'Get All Subscription Plans',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SubscriptionPlan' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Subscription Plan',
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
    },
    '/subscription-plan/{id}': {
      get: {
        summary: 'Get Specific Subscription Plan',
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
                schema: { $ref: '#/components/schemas/SubscriptionPlan' },
              },
            },
          },
          '404': { description: 'Subscription plan not found' },
        },
      },
      put: {
        summary: 'Update Subscription Plan',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubscriptionPlanUpdate' },
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
    '/subscription': {
      get: {
        summary: 'Get Subscription',
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
        summary: 'Create Subscription',
        parameters: [
          {
            name: 'customerId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'planId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '201': { description: 'Subscription created successfully' },
          '400': { description: 'Invalid input' },
        },
      },
      put: {
        summary: 'Update Subscription',
        parameters: [
          {
            name: 'customerId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'planId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Subscription updated successfully' },
          '400': { description: 'Invalid input' },
          '404': { description: 'Subscription not found' },
        },
      },
      delete: {
        summary: 'Cancel Subscription',
        parameters: [
          {
            name: 'customerId',
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
        summary: 'Get All Invoices',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Invoice' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create Invoice',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InvoiceInput' },
            },
          },
        },
        responses: {
          '201': { description: 'Invoice created successfully' },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/invoice/{id}': {
      get: {
        summary: 'Get Specific Invoice',
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
                schema: { $ref: '#/components/schemas/Invoice' },
              },
            },
          },
          '404': { description: 'Invoice not found' },
        },
      },
    },
    '/invoice/customer/{customerId}': {
      get: {
        summary: 'Get Customer Invoices',
        parameters: [
          {
            name: 'customerId',
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
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Invoice' },
                },
              },
            },
          },
        },
      },
    },
    '/payment': {
      post: {
        summary: 'Process Payment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentInput' },
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
      get: {
        summary: 'Run Billing Process',
        responses: {
          '200': { description: 'Billing process completed successfully' },
        },
      },
      post: {
        summary: 'Generate Invoice',
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
      },
      CustomerInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
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
      SubscriptionPlanUpdate: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
        },
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
      },
      InvoiceInput: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          amount: { type: 'number' },
          due_date: { type: 'string', format: 'date-time' },
        },
        required: ['customer_id', 'amount', 'due_date'],
      },
      PaymentInput: {
        type: 'object',
        properties: {
          invoice_id: { type: 'string' },
          customer_id: { type: 'string' },
          amount: { type: 'number' },
          payment_method: { type: 'string', enum: ['credit_card', 'bank_transfer', 'paypal', 'other'] },
        },
        required: ['invoice_id', 'customer_id', 'amount', 'payment_method'],
      },
    },
  },
};