# Subscription Management API

This project is a Subscription Management API built to run on Cloudflare Workers. It provides endpoints for managing customers, subscriptions, invoices, and payments.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Design Approach](#design-approach)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Deployment](#deployment)
6. [API Documentation](#api-documentation)
7. [Testing](#testing)
8. [Contributing](#contributing)

## Project Overview

This Subscription Management API allows you to:

- Manage customers and their subscriptions
- Handle subscription plans
- Generate and manage invoices
- Process payments
- Run automated billing processes

The API is designed to be scalable, maintainable, and easy to extend.

## Design Approach

The project follows these key design principles:

1. **Modular Architecture**: The codebase is organized into separate modules (handlers, services, utils) for better maintainability and separation of concerns.

2. **Serverless**: Built to run on Cloudflare Workers, leveraging the serverless architecture for scalability and reduced operational overhead.

3. **Key-Value Storage**: Utilizes Cloudflare Workers KV for data persistence, allowing for fast, low-latency data access.

4. **RESTful API**: Follows REST principles for a standardized and intuitive API design.

5. **Error Handling**: Implements consistent error handling and reporting across the application.

6. **Scheduled Tasks**: Uses Cloudflare Workers' built-in cron triggers for automated processes like billing and payment retries.

7. **API Documentation**: Integrates Swagger/OpenAPI for clear and interactive API documentation.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or later)
- npm (v6 or later)
- Wrangler CLI (`npm install -g @cloudflare/wrangler`)

You'll also need a Cloudflare account with Workers and KV enabled.

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/your-username/subscription-management-api.git
   cd subscription-management-api
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Configure Wrangler:
   Create a `wrangler.toml` file in the project root with the following content (replace with your own values):

   ```toml
   name = "billing-app"
   main = "src/index.ts"
   account_id = "your_account_id"
   workers_dev = true
   compatibility_date = "2023-05-18"

   [build]
   command = "npm run build"

   [[kv_namespaces]]
   binding = "CUSTOMERS"
   id = "kv_id"

   [[kv_namespaces]]
   binding = "SUBSCRIPTIONS"
   id = "kv_id"

   [[kv_namespaces]]
   binding = "INVOICES"
   id = "kv_id"

   [[kv_namespaces]]
   binding = "PAYMENTS"
   id = "kv_id"

   [vars]
   SENDGRID_API_KEY = "YOUR API KEY"
   FROM_EMAIL = "test@example"

   [triggers]
   crons = ["0 0 * * *", "0 */4 * * *"]
   ```

## Deployment

1. Build the project:

   ```
   npm run build
   ```

2. Deploy to Cloudflare Workers:
   ```
   wrangler publish
   ```

## API Documentation

Once deployed, you can access the Swagger UI documentation at:

```
https://your-worker-subdomain.workers.dev/api-docs
```

This provides an interactive interface to explore and test the API endpoints.

## Testing

To run the test suite:

```
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure you update tests as appropriate and adhere to the existing coding style.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
