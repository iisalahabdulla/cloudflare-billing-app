export const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Billing System API',
        version: '1.0.0',
        description: 'API for managing subscriptions, customers, billing, and payments',
    },
    paths: {
        '/auth/register': {
            post: {
                summary: 'Register a new customer',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    password: { type: 'string' },
                                },
                                required: ['name', 'email', 'password'],
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Customer registered successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        token: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Bad request' },
                },
            },
        },
        '/auth/login': {
            post: {
                summary: 'Login a customer',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string' },
                                    password: { type: 'string' },
                                },
                                required: ['email', 'password'],
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Login successful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        token: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    '401': { description: 'Unauthorized' },
                },
            },
        },
        '/customer': {
            get: {
                summary: 'Get Customer Details',
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
                summary: 'Update Customer',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CustomerInput' },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Customer updated successfully' },
                    '400': { description: 'Invalid input' },
                },
            },
        },
        '/customer/subscription': {
            get: {
                summary: 'Get Customer Subscription Details',
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
                responses: {
                    '200': { description: 'Subscription cancelled successfully' },
                    '404': { description: 'Subscription not found' },
                },
            },
        },
        '/invoice': {
            get: {
                summary: 'Get Customer Invoices',
                parameters: [
                    {
                        name: "id",
                        in: "query",
                        required: false,
                        schema: { type: 'string' },
                    }
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
                parameters: [
                    {
                        name: 'invoiceId',
                        in: 'query',
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
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
            PaymentInput: {
                type: 'object',
                properties: {
                    amount: { type: 'number' },
                    payment_method: { type: 'string', enum: ['credit_card', 'bank_transfer', 'paypal', 'other'] },
                },
                required: ['amount', 'payment_method'],
            },
        },
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
};
