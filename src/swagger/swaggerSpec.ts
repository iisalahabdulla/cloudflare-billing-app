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
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "customerId",
                        in: "query",
                        required: false,
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
                    '403': { description: 'Forbidden' },
                    '404': { description: 'Customer not found' },
                },
            },
            post: {
                summary: 'Create or Update Customer',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CustomerInput' },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Customer created/updated successfully' },
                    '400': { description: 'Invalid input' },
                    '403': { description: 'Forbidden' },
                },
            },
            put: {
                summary: 'Update Customer Subscription',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    action: { type: 'string', enum: ['assign_plan', 'update_status'] },
                                    planId: { type: 'string' },
                                    status: { type: 'string', enum: ['active', 'inactive', 'pending', 'cancelled'] },
                                },
                                required: ['action'],
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Subscription updated successfully' },
                    '400': { description: 'Invalid input' },
                },
            },
            patch: {
                summary: 'Change Customer Plan',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    newPlanId: { type: 'string' },
                                },
                                required: ['newPlanId'],
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Plan changed successfully' },
                    '400': { description: 'Invalid input' },
                },
            },
        },
        '/customer/subscription': {
            get: {
                summary: 'Get Customer Subscription Details',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "customerId",
                        in: "query",
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SubscriptionDetails' },
                            },
                        },
                    },
                    '400': { description: 'Customer does not have an active subscription' },
                    '404': { description: 'Customer or subscription plan not found' },
                },
            },
        },
        '/customer/activate': {
            post: {
                summary: 'Activate Customer Subscription',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    planId: { type: 'string' },
                                },
                                required: ['planId'],
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Subscription activated successfully' },
                    '400': { description: 'Invalid input or subscription already active' },
                    '404': { description: 'Customer or subscription plan not found' },
                },
            },
        },
        '/customer/list': {
            get: {
                summary: 'List Customers',
                security: [{ bearerAuth: [] }, { roles: ['admin'] }],
                parameters: [
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: 'integer', default: 10 },
                    },
                    {
                        name: "cursor",
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
                                    type: 'object',
                                    properties: {
                                        customers: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Customer' },
                                        },
                                        nextCursor: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/plan': {
            get: {
                summary: 'Get All Subscription Plans',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: 'integer', default: 10 },
                    },
                    {
                        name: "cursor",
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
                                    type: 'object',
                                    properties: {
                                        plans: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/SubscriptionPlan' },
                                        },
                                        nextCursor: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Create Subscription Plan',
                security: [{ bearerAuth: [] }, { roles: ['admin'] }],
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
        '/plan/{id}': {
            get: {
                summary: 'Get Specific Subscription Plan',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "query",
                        required: true,
                        schema: { type: 'string' },
                    }
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
                security: [{ bearerAuth: [] }, { roles: ['admin'] }],
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
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: 'integer', default: 10 },
                    },
                    {
                        name: "cursor",
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
                                    type: 'object',
                                    properties: {
                                        subscriptions: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Subscription' },
                                        },
                                        nextCursor: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    '404': { description: 'Subscription not found' },
                },
            },
            post: {
                summary: 'Create Subscription',
                security: [{ bearerAuth: [] }],
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
                security: [{ bearerAuth: [] }],
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
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': { description: 'Subscription cancelled successfully' },
                    '404': { description: 'Subscription not found' },
                },
            },
        },
        '/invoice': {
            get: {
                summary: 'Get Customer Invoices',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "customerId",
                        in: "query",
                        required: false,
                        schema: { type: 'string' },
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: 'integer', default: 10 },
                    },
                    {
                        name: "cursor",
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
                                    type: 'object',
                                    properties: {
                                        invoices: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Invoice' },
                                        },
                                        nextCursor: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/payment': {
            get: {
                summary: 'List Payments',
                security: [{ bearerAuth: [] }, { roles: ['admin'] }],
                parameters: [
                    {
                        name: "status",
                        in: "query",
                        required: false,
                        schema: { type: 'string', enum: ['success', 'failed', 'pending'] },
                    },
                    {
                        name: "limit",
                        in: "query",
                        required: false,
                        schema: { type: 'integer', default: 10 },
                    },
                    {
                        name: "cursor",
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
                                    type: 'object',
                                    properties: {
                                        payments: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Payment' },
                                        },
                                        nextCursor: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                summary: 'Process Payment',
                security: [{ bearerAuth: [] }],
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
                security: [{ bearerAuth: [] }, { roles: ['admin'] }],
                responses: {
                    '200': { description: 'Billing process completed successfully' },
                },
            },
            post: {
                summary: 'Generate Invoice',
                security: [{ bearerAuth: [] }, { roles: ['admin'] }],
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
                    roles: { type: 'array', items: { type: 'string' } },
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
            },
            SubscriptionDetails: {
                type: 'object',
                properties: {
                    customer: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            email: { type: 'string' },
                        },
                    },
                    subscription: {
                        type: 'object',
                        properties: {
                            plan_id: { type: 'string' },
                            plan_name: { type: 'string' },
                            status: { type: 'string' },
                            billing_cycle: { type: 'string' },
                            price: { type: 'number' },
                            current_period_start: { type: 'string', format: 'date-time' },
                            current_period_end: { type: 'string', format: 'date-time' },
                        },
                    },
                },
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
