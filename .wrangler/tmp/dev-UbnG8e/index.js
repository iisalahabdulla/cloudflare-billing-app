// .wrangler/tmp/bundle-t5EvaK/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/utils/errorHandler.ts
var AppError = class extends Error {
  statusCode;
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
};
function handleError(error) {
  console.error(error);
  if (error instanceof AppError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (error instanceof Error) {
    return new Response(JSON.stringify({ error: "Internal Server Error", message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ error: "Unknown Error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" }
  });
}

// src/handlers/subscriptionHandler.ts
async function handleSubscription(request, kvService) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("customerId");
    const planId = url.searchParams.get("planId");
    if (!customerId) {
      throw new AppError("Customer ID is required", 400);
    }
    switch (request.method) {
      case "GET":
        return getSubscription(customerId, kvService);
      case "POST":
        if (!planId) {
          throw new AppError("Plan ID is required for subscription creation", 400);
        }
        return createSubscription(customerId, planId, kvService);
      case "PUT":
        if (!planId) {
          throw new AppError("Plan ID is required for subscription update", 400);
        }
        return updateSubscription(customerId, planId, kvService);
      case "DELETE":
        return cancelSubscription(customerId, kvService);
      default:
        throw new AppError("Method not allowed", 405);
    }
  } catch (error) {
    return handleError(error);
  }
}
async function getSubscription(customerId, kvService) {
  const customer = await kvService.getCustomer(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }
  if (!customer.subscription_plan_id) {
    throw new AppError("Customer does not have an active subscription", 404);
  }
  const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
  if (!plan) {
    throw new AppError("Subscription plan not found", 404);
  }
  const subscription = {
    customerId: customer.id,
    planId: plan.id,
    planName: plan.name,
    status: customer.subscription_status,
    startDate: customer.subscription_start_date,
    endDate: customer.subscription_end_date
  };
  return new Response(JSON.stringify(subscription), {
    headers: { "Content-Type": "application/json" }
  });
}
async function createSubscription(customerId, planId, kvService) {
  const customer = await kvService.getCustomer(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }
  if (customer.subscription_plan_id) {
    throw new AppError("Customer already has an active subscription", 400);
  }
  const plan = await kvService.getSubscriptionPlan(planId);
  if (!plan) {
    throw new AppError("Subscription plan not found", 404);
  }
  await kvService.assignSubscriptionPlan(customerId, planId);
  return new Response("Subscription created successfully", { status: 201 });
}
async function updateSubscription(customerId, newPlanId, kvService) {
  const customer = await kvService.getCustomer(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }
  if (!customer.subscription_plan_id) {
    throw new AppError("Customer does not have an active subscription", 400);
  }
  const newPlan = await kvService.getSubscriptionPlan(newPlanId);
  if (!newPlan) {
    throw new AppError("New subscription plan not found", 404);
  }
  await kvService.changePlan(customerId, newPlanId);
  return new Response("Subscription updated successfully", { status: 200 });
}
async function cancelSubscription(customerId, kvService) {
  const customer = await kvService.getCustomer(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }
  if (!customer.subscription_plan_id) {
    throw new AppError("Customer does not have an active subscription", 400);
  }
  await kvService.updateSubscriptionStatus(customerId, "cancelled");
  return new Response("Subscription cancelled successfully", { status: 200 });
}

// src/handlers/invoiceHandler.ts
async function handleInvoice(request, kvService, emailService) {
  try {
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get("id");
    const customerId = url.searchParams.get("customerId");
    switch (request.method) {
      case "GET":
        if (invoiceId) {
          return handleGetInvoice(invoiceId, kvService);
        } else if (customerId) {
          return handleListCustomerInvoices(customerId, kvService);
        } else {
          return handleListAllInvoices(kvService);
        }
      case "POST":
        return handleCreateInvoice(request, kvService, emailService);
      default:
        throw new AppError("Method not allowed", 405);
    }
  } catch (error) {
    return handleError(error);
  }
}
async function handleGetInvoice(invoiceId, kvService) {
  const invoice = await kvService.getInvoice(invoiceId);
  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }
  return new Response(JSON.stringify(invoice), {
    headers: { "Content-Type": "application/json" }
  });
}
async function handleListCustomerInvoices(customerId, kvService) {
  const invoices = await kvService.listInvoices(customerId);
  return new Response(JSON.stringify(invoices), {
    headers: { "Content-Type": "application/json" }
  });
}
async function handleListAllInvoices(kvService) {
  const invoices = await kvService.listInvoices();
  return new Response(JSON.stringify(invoices), {
    headers: { "Content-Type": "application/json" }
  });
}
async function handleCreateInvoice(request, kvService, emailService) {
  try {
    const invoiceData = await request.json();
    if (!invoiceData.customer_id || !invoiceData.amount || !invoiceData.due_date) {
      throw new AppError("Customer ID, amount, and due date are required", 400);
    }
    const invoice = {
      id: `INV-${Date.now()}-${invoiceData.customer_id}`,
      ...invoiceData,
      payment_status: invoiceData.payment_status || "pending",
      payment_date: invoiceData.payment_date || null
    };
    await kvService.setInvoice(invoice);
    const customer = await kvService.getCustomer(invoice.customer_id);
    if (customer) {
      await emailService.sendInvoiceNotification(customer.email, invoice.id, invoice.amount, invoice.due_date);
    }
    return new Response(JSON.stringify(invoice), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return handleError(error);
  }
}

// src/handlers/customerHandler.ts
async function handleCustomer(request, kvService, billingDO) {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get("id");
    if (!customerId) {
      throw new AppError("Customer ID is required", 400);
    }
    const id = billingDO.idFromName(customerId);
    const obj = billingDO.get(id);
    await obj.fetch(`https://dummy-url/session/${customerId}`, { method: "POST" });
    switch (request.method) {
      case "GET":
        if (url.searchParams.get("subscription") === "true") {
          return handleGetSubscriptionDetails(customerId, kvService, obj);
        }
        return handleGetCustomer(customerId, kvService);
      case "POST":
        return handleCreateOrUpdateCustomer(customerId, request, kvService, obj);
      case "PUT":
        return handleUpdateCustomerSubscription(customerId, request, kvService, obj);
      case "PATCH":
        return handleChangePlan(customerId, request, kvService, obj);
      default:
        throw new AppError("Method not allowed", 405);
    }
  } catch (error) {
    return handleError(error);
  }
}
async function handleGetCustomer(customerId, kvService) {
  const customer = await kvService.getCustomer(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }
  return new Response(JSON.stringify(customer), {
    headers: { "Content-Type": "application/json" }
  });
}
async function handleCreateOrUpdateCustomer(customerId, request, kvService, obj) {
  try {
    const customerData = await request.json();
    if (!customerData.name || !customerData.email) {
      return new Response("Name and email are required", { status: 400 });
    }
    customerData.id = customerId;
    customerData.subscription_plan_id = customerData.subscription_plan_id || null;
    customerData.subscription_status = customerData.subscription_status || "inactive";
    customerData.subscription_start_date = customerData.subscription_start_date || null;
    customerData.subscription_end_date = customerData.subscription_end_date || null;
    await kvService.setCustomer(customerData);
    if (customerData.subscription_start_date && customerData.subscription_end_date) {
      await obj.fetch(`https://dummy-url/billing-cycle/${customerId}`, {
        method: "POST",
        body: JSON.stringify({
          startDate: customerData.subscription_start_date,
          endDate: customerData.subscription_end_date
        })
      });
    }
    return new Response("Customer created/updated successfully", { status: 200 });
  } catch (error) {
    return new Response("Invalid customer data", { status: 400 });
  }
}
async function handleUpdateCustomerSubscription(customerId, request, kvService, obj) {
  try {
    const { action, planId, status } = await request.json();
    if (action === "assign_plan" && planId) {
      await kvService.assignSubscriptionPlan(customerId, planId);
      return new Response("Subscription plan assigned successfully", { status: 200 });
    } else if (action === "update_status" && status) {
      if (status === "active" || status === "inactive" || status === "pending" || status === "cancelled") {
        await kvService.updateSubscriptionStatus(customerId, status);
        return new Response("Subscription status updated successfully", { status: 200 });
      } else {
        return new Response("Invalid subscription status", { status: 400 });
      }
    } else {
      return new Response("Invalid action or missing required data", { status: 400 });
    }
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 400 });
  }
}
async function handleChangePlan(customerId, request, kvService, obj) {
  try {
    const { newPlanId } = await request.json();
    if (!newPlanId) {
      return new Response("New plan ID is required", { status: 400 });
    }
    await kvService.changePlan(customerId, newPlanId);
    return new Response("Plan changed successfully", { status: 200 });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 400 });
  }
}
async function handleGetSubscriptionDetails(customerId, kvService, obj) {
  try {
    const customer = await kvService.getCustomer(customerId);
    if (!customer) {
      throw new AppError("Customer not found", 404);
    }
    if (!customer.subscription_plan_id) {
      throw new AppError("Customer does not have an active subscription", 400);
    }
    const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
    if (!plan) {
      throw new AppError("Subscription plan not found", 404);
    }
    const billingCycleResponse = await obj.fetch(`https://dummy-url/billing-cycle/${customerId}`);
    const billingCycle = await billingCycleResponse.json();
    const subscriptionDetails = {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email
      },
      subscription: {
        plan_id: plan.id,
        plan_name: plan.name,
        status: customer.subscription_status,
        billing_cycle: plan.billing_cycle,
        price: plan.price,
        current_period_start: billingCycle.startDate,
        current_period_end: billingCycle.endDate
      }
    };
    return new Response(JSON.stringify(subscriptionDetails), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(`Error retrieving subscription details: ${error.message}`, { status: 500 });
  }
}

// src/handlers/subscriptionPlanHandler.ts
async function handleSubscriptionPlan(request, kvService) {
  const url = new URL(request.url);
  const planId = url.searchParams.get("id");
  switch (request.method) {
    case "GET":
      return handleGetSubscriptionPlan(planId, kvService);
    case "POST":
      return handleCreateSubscriptionPlan(request, kvService);
    case "PUT":
      return handleUpdateSubscriptionPlan(planId, request, kvService);
    case "DELETE":
      return handleDeleteSubscriptionPlan(planId, kvService);
    default:
      return new Response("Method not allowed", { status: 405 });
  }
}
async function handleGetSubscriptionPlan(planId, kvService) {
  if (planId) {
    const plan = await kvService.getSubscriptionPlan(planId);
    if (plan) {
      return new Response(JSON.stringify(plan), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response("Subscription plan not found", { status: 404 });
    }
  } else {
    const plans = await kvService.listSubscriptionPlans();
    return new Response(JSON.stringify(plans), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
async function handleCreateSubscriptionPlan(request, kvService) {
  try {
    const planData = await request.json();
    if (!planData.id || !planData.name || !planData.price || !planData.billing_cycle) {
      return new Response("ID, name, price, and billing cycle are required", { status: 400 });
    }
    planData.status = planData.status || "inactive";
    planData.features = planData.features || [];
    await kvService.setSubscriptionPlan(planData);
    return new Response("Subscription plan created successfully", { status: 201 });
  } catch (error) {
    return new Response("Invalid subscription plan data", { status: 400 });
  }
}
async function handleUpdateSubscriptionPlan(planId, request, kvService) {
  if (!planId) {
    return new Response("Subscription plan ID is required", { status: 400 });
  }
  try {
    const existingPlan = await kvService.getSubscriptionPlan(planId);
    if (!existingPlan) {
      return new Response("Subscription plan not found", { status: 404 });
    }
    const updatedPlanData = await request.json();
    const updatedPlan = { ...existingPlan, ...updatedPlanData, id: planId };
    await kvService.setSubscriptionPlan(updatedPlan);
    return new Response("Subscription plan updated successfully", { status: 200 });
  } catch (error) {
    return new Response("Invalid subscription plan data", { status: 400 });
  }
}
async function handleDeleteSubscriptionPlan(planId, kvService) {
  if (!planId) {
    return new Response("Subscription plan ID is required", { status: 400 });
  }
  const existingPlan = await kvService.getSubscriptionPlan(planId);
  if (!existingPlan) {
    return new Response("Subscription plan not found", { status: 404 });
  }
  await kvService.deleteSubscriptionPlan(planId);
  return new Response("Subscription plan deleted successfully", { status: 200 });
}

// src/handlers/paymentHandler.ts
async function handlePayment(request, kvService, emailService) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("id");
  switch (request.method) {
    case "GET":
      return handleGetPayment(paymentId, kvService);
    case "POST":
      return handleProcessPayment(request, kvService, emailService);
    default:
      return new Response("Method not allowed", { status: 405 });
  }
}
async function handleGetPayment(paymentId, kvService) {
  if (paymentId) {
    const payment = await kvService.getPayment(paymentId);
    if (payment) {
      return new Response(JSON.stringify(payment), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response("Payment not found", { status: 404 });
    }
  } else {
    const payments = await kvService.listPayments();
    return new Response(JSON.stringify(payments), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
async function handleProcessPayment(request, kvService, emailService) {
  try {
    const paymentData = await request.json();
    if (!paymentData.invoice_id || !paymentData.customer_id || !paymentData.amount || !paymentData.payment_method) {
      return new Response("Invalid payment data", { status: 400 });
    }
    const paymentStatus = await processPayment(paymentData);
    const payment = {
      id: `PAY-${Date.now()}-${paymentData.customer_id}`,
      ...paymentData,
      payment_date: (/* @__PURE__ */ new Date()).toISOString(),
      status: paymentStatus
    };
    await kvService.setPayment(payment);
    const customer = await kvService.getCustomer(payment.customer_id);
    if (!customer) {
      throw new Error("Customer not found");
    }
    if (paymentStatus === "success") {
      await updateInvoiceStatus(paymentData.invoice_id, kvService);
      await emailService.sendPaymentSuccessNotification(customer.email, payment.invoice_id, payment.amount);
    } else {
      await emailService.sendPaymentFailedNotification(customer.email, payment.invoice_id, payment.amount);
    }
    return new Response(JSON.stringify(payment), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(`Error processing payment: ${error.message}`, { status: 400 });
  }
}
async function processPayment(paymentData) {
  return Math.random() < 0.9 ? "success" : "failed";
}
async function updateInvoiceStatus(invoiceId, kvService) {
  const invoice = await kvService.getInvoice(invoiceId);
  if (invoice) {
    invoice.payment_status = "paid";
    invoice.payment_date = (/* @__PURE__ */ new Date()).toISOString();
    await kvService.setInvoice(invoice);
  }
}

// src/handlers/billingHandler.ts
async function handleBilling(request, kvService, emailService, billingDO) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");
  if (request.method === "POST") {
    if (!customerId) {
      return new Response("Customer ID is required for invoice generation", { status: 400 });
    }
    return handleGenerateInvoice(customerId, kvService, emailService, billingDO);
  } else if (request.method === "GET") {
    return handleBillingProcess(customerId, kvService, emailService, billingDO);
  } else {
    return new Response("Method not allowed", { status: 405 });
  }
}
async function handleGenerateInvoice(customerId, kvService, emailService, billingDO) {
  try {
    const customer = await kvService.getCustomer(customerId);
    if (!customer) {
      return new Response("Customer not found", { status: 404 });
    }
    if (customer.subscription_status !== "active" || !customer.subscription_plan_id) {
      return new Response("Customer does not have an active subscription", { status: 400 });
    }
    const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
    if (!plan) {
      return new Response("Subscription plan not found", { status: 404 });
    }
    const id = billingDO.idFromName(customerId);
    const obj = billingDO.get(id);
    const billingCycleResponse = await obj.fetch(`https://dummy-url/billing-cycle/${customerId}`);
    const billingCycle = await billingCycleResponse.json();
    if (isBillingCycle(billingCycle)) {
      const invoice = await createInvoice(customer, plan, billingCycle, kvService, emailService);
      return new Response(JSON.stringify(invoice), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      throw new Error("Invalid billing cycle data");
    }
  } catch (error) {
    return new Response(`Error generating invoice: ${error.message}`, { status: 500 });
  }
}
async function handleBillingProcess(customerId, kvService, emailService, billingDO) {
  try {
    let customers;
    if (customerId) {
      const customer = await kvService.getCustomer(customerId);
      customers = customer ? [customer] : [];
    } else {
      customers = await kvService.listCustomers();
    }
    const invoicesGenerated = await generateInvoices(customers, kvService, emailService, billingDO);
    return new Response(`Billing process completed. Generated ${invoicesGenerated} invoices.`, { status: 200 });
  } catch (error) {
    return new Response(`Error during billing process: ${error.message}`, { status: 500 });
  }
}
async function generateInvoices(customers, kvService, emailService, billingDO) {
  let invoicesGenerated = 0;
  for (const customer of customers) {
    if (customer.subscription_status === "active" && customer.subscription_plan_id) {
      const plan = await kvService.getSubscriptionPlan(customer.subscription_plan_id);
      if (plan && isInvoiceDue(customer, plan)) {
        const id = billingDO.idFromName(customer.id);
        const obj = billingDO.get(id);
        const billingCycleResponse = await obj.fetch(`https://dummy-url/billing-cycle/${customer.id}`);
        const billingCycle = await billingCycleResponse.json();
        if (isBillingCycle(billingCycle)) {
          await createInvoice(customer, plan, billingCycle, kvService, emailService);
          invoicesGenerated++;
        } else {
          console.error(`Invalid billing cycle data for customer ${customer.id}`);
        }
      }
    }
  }
  return invoicesGenerated;
}
function isInvoiceDue(customer, plan) {
  const now = /* @__PURE__ */ new Date();
  const endDate = new Date(customer.subscription_end_date);
  const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
  switch (plan.billing_cycle) {
    case "monthly":
      return daysUntilEnd <= 3;
    case "quarterly":
      return daysUntilEnd <= 7;
    case "yearly":
      return daysUntilEnd <= 14;
    default:
      return false;
  }
}
async function createInvoice(customer, plan, billingCycle, kvService, emailService) {
  const invoice = {
    id: `INV-${Date.now()}-${customer.id}`,
    customer_id: customer.id,
    amount: plan.price,
    due_date: billingCycle.endDate,
    payment_status: "pending",
    payment_date: null
  };
  await kvService.setInvoice(invoice);
  await emailService.sendInvoiceNotification(customer.email, invoice.id, invoice.amount, invoice.due_date);
  const oldEndDate = billingCycle.endDate;
  customer.subscription_start_date = oldEndDate;
  customer.subscription_end_date = kvService.calculateSubscriptionEndDate(plan.billing_cycle, oldEndDate);
  await kvService.setCustomer(customer);
  return invoice;
}
function isBillingCycle(obj) {
  return typeof obj === "object" && obj !== null && "startDate" in obj && "endDate" in obj && typeof obj.startDate === "string" && typeof obj.endDate === "string";
}

// src/handlers/paymentRetryHandler.ts
async function handlePaymentRetry(kvService, emailService) {
  try {
    const failedPayments = await kvService.listPayments("failed");
    const retriedPayments = await retryFailedPayments(failedPayments, kvService, emailService);
    return new Response(`Payment retry process completed. Retried ${retriedPayments} payments.`, { status: 200 });
  } catch (error) {
    return new Response(`Error during payment retry process: ${error.message}`, { status: 500 });
  }
}
async function retryFailedPayments(failedPayments, kvService, emailService) {
  let retriedPayments = 0;
  for (const payment of failedPayments) {
    const retryResult = await retryPayment(payment, kvService, emailService);
    if (retryResult) {
      retriedPayments++;
    }
  }
  return retriedPayments;
}
async function retryPayment(payment, kvService, emailService) {
  const paymentStatus = Math.random() < 0.7 ? "success" : "failed";
  const updatedPayment = {
    ...payment,
    status: paymentStatus,
    payment_date: (/* @__PURE__ */ new Date()).toISOString()
  };
  await kvService.setPayment(updatedPayment);
  const customer = await kvService.getCustomer(payment.customer_id);
  if (!customer) {
    throw new Error("Customer not found");
  }
  if (paymentStatus === "success") {
    await updateInvoiceStatus2(payment.invoice_id, kvService);
    await emailService.sendPaymentSuccessNotification(customer.email, payment.invoice_id, payment.amount);
    return true;
  } else {
    await emailService.sendPaymentFailedNotification(customer.email, payment.invoice_id, payment.amount);
    return false;
  }
}
async function updateInvoiceStatus2(invoiceId, kvService) {
  const invoice = await kvService.getInvoice(invoiceId);
  if (invoice) {
    invoice.payment_status = "paid";
    invoice.payment_date = (/* @__PURE__ */ new Date()).toISOString();
    await kvService.setInvoice(invoice);
  }
}

// src/services/kvService.ts
var KVService = class {
  namespaces;
  constructor(namespaces) {
    this.namespaces = namespaces;
  }
  async getCustomer(id) {
    const data = await this.namespaces.CUSTOMERS.get(id);
    return data ? JSON.parse(data) : null;
  }
  async setCustomer(customer) {
    await this.namespaces.CUSTOMERS.put(customer.id, JSON.stringify(customer));
  }
  async getSubscription(id) {
    return JSON.parse(await this.namespaces.SUBSCRIPTIONS.get(id) || "null");
  }
  async setSubscription(id, data) {
    await this.namespaces.SUBSCRIPTIONS.put(id, JSON.stringify(data));
  }
  async getInvoice(id) {
    const data = await this.namespaces.INVOICES.get(id);
    return data ? JSON.parse(data) : null;
  }
  async setInvoice(invoice) {
    await this.namespaces.INVOICES.put(invoice.id, JSON.stringify(invoice));
  }
  async getPayment(id) {
    const data = await this.namespaces.PAYMENTS.get(id);
    return data ? JSON.parse(data) : null;
  }
  async setPayment(payment) {
    await this.namespaces.PAYMENTS.put(payment.id, JSON.stringify(payment));
  }
  async getSubscriptionPlan(id) {
    const data = await this.namespaces.SUBSCRIPTIONS.get(id);
    return data ? JSON.parse(data) : null;
  }
  async setSubscriptionPlan(plan) {
    await this.namespaces.SUBSCRIPTIONS.put(plan.id, JSON.stringify(plan));
  }
  async listSubscriptionPlans() {
    const list = await this.namespaces.SUBSCRIPTIONS.list();
    const plans = [];
    for (const key of list.keys) {
      const plan = await this.getSubscriptionPlan(key.name);
      if (plan)
        plans.push(plan);
    }
    return plans;
  }
  async deleteSubscriptionPlan(id) {
    await this.namespaces.SUBSCRIPTIONS.delete(id);
  }
  async listInvoices(customerId) {
    const list = await this.namespaces.INVOICES.list();
    const invoices = [];
    for (const key of list.keys) {
      const invoice = await this.getInvoice(key.name);
      if (invoice && (!customerId || invoice.customer_id === customerId)) {
        invoices.push(invoice);
      }
    }
    return invoices;
  }
  async listCustomers() {
    const list = await this.namespaces.CUSTOMERS.list();
    const customers = [];
    for (const key of list.keys) {
      const customer = await this.getCustomer(key.name);
      if (customer)
        customers.push(customer);
    }
    return customers;
  }
  calculateSubscriptionEndDate(billingCycle, startDate = (/* @__PURE__ */ new Date()).toISOString()) {
    const date = new Date(startDate);
    switch (billingCycle) {
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      case "quarterly":
        date.setMonth(date.getMonth() + 3);
        break;
      case "yearly":
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString();
  }
  async changePlan(customerId, newPlanId) {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    const newPlan = await this.getSubscriptionPlan(newPlanId);
    const oldPlan = customer.subscription_plan_id ? await this.getSubscriptionPlan(customer.subscription_plan_id) : null;
    if (!newPlan) {
      throw new Error("New plan not found");
    }
    const now = /* @__PURE__ */ new Date();
    const oldEndDate = new Date(customer.subscription_end_date || now);
    const daysLeft = (oldEndDate.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24);
    const totalDays = this.getDaysInBillingCycle(oldPlan?.billing_cycle || newPlan.billing_cycle);
    let proratedRefund = 0;
    if (oldPlan) {
      proratedRefund = oldPlan.price / totalDays * daysLeft;
    }
    const proratedCharge = newPlan.price / totalDays * daysLeft;
    const invoice = {
      id: `INV-CHANGE-${Date.now()}-${customer.id}`,
      customer_id: customer.id,
      amount: proratedCharge - proratedRefund,
      due_date: now.toISOString(),
      payment_status: "pending",
      payment_date: null
    };
    await this.setInvoice(invoice);
    customer.subscription_plan_id = newPlanId;
    customer.subscription_start_date = now.toISOString();
    customer.subscription_end_date = this.calculateSubscriptionEndDate(newPlan.billing_cycle, now.toISOString());
    await this.setCustomer(customer);
  }
  getDaysInBillingCycle(billingCycle) {
    switch (billingCycle) {
      case "monthly":
        return 30;
      case "quarterly":
        return 90;
      case "yearly":
        return 365;
      default:
        return 30;
    }
  }
  async listPayments(status) {
    const list = await this.namespaces.PAYMENTS.list();
    const payments = [];
    for (const key of list.keys) {
      const payment = await this.getPayment(key.name);
      if (payment && (!status || payment.status === status)) {
        payments.push(payment);
      }
    }
    return payments;
  }
  async assignSubscriptionPlan(customerId, planId) {
    const customer = await this.getCustomer(customerId);
    const plan = await this.getSubscriptionPlan(planId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    if (!plan) {
      throw new Error("Subscription plan not found");
    }
    customer.subscription_plan_id = planId;
    customer.subscription_status = "active";
    customer.subscription_start_date = (/* @__PURE__ */ new Date()).toISOString();
    customer.subscription_end_date = this.calculateSubscriptionEndDate(plan.billing_cycle);
    await this.setCustomer(customer);
  }
  async updateSubscriptionStatus(customerId, status) {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }
    customer.subscription_status = status;
    if (status === "cancelled") {
      customer.subscription_end_date = (/* @__PURE__ */ new Date()).toISOString();
    }
    await this.setCustomer(customer);
  }
};

// src/services/emailService.ts
var EmailService = class {
  apiKey;
  fromEmail;
  constructor(apiKey, fromEmail) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }
  async sendEmail(emailData) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: emailData.to }] }],
        from: { email: this.fromEmail },
        subject: emailData.subject,
        content: [
          { type: "text/plain", value: emailData.text },
          { type: "text/html", value: emailData.html }
        ]
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
  }
  async sendInvoiceNotification(to, invoiceId, amount, dueDate) {
    const subject = `New Invoice Generated - ${invoiceId}`;
    const text = `A new invoice (${invoiceId}) for $${amount} has been generated. It is due on ${dueDate}.`;
    const html = `<p>A new invoice (${invoiceId}) for $${amount} has been generated. It is due on ${dueDate}.</p>`;
    await this.sendEmail({ to, subject, text, html });
  }
  async sendPaymentSuccessNotification(to, invoiceId, amount) {
    const subject = `Payment Successful - Invoice ${invoiceId}`;
    const text = `Your payment of $${amount} for invoice ${invoiceId} has been successfully processed.`;
    const html = `<p>Your payment of $${amount} for invoice ${invoiceId} has been successfully processed.</p>`;
    await this.sendEmail({ to, subject, text, html });
  }
  async sendPaymentFailedNotification(to, invoiceId, amount) {
    const subject = `Payment Failed - Invoice ${invoiceId}`;
    const text = `Your payment of $${amount} for invoice ${invoiceId} has failed. Please update your payment method and try again.`;
    const html = `<p>Your payment of $${amount} for invoice ${invoiceId} has failed. Please update your payment method and try again.</p>`;
    await this.sendEmail({ to, subject, text, html });
  }
};

// src/durable_objects/BillingDO.ts
var BillingDO = class {
  state;
  customerSessions;
  billingCycles;
  constructor(state) {
    this.state = state;
    this.customerSessions = /* @__PURE__ */ new Map();
    this.billingCycles = /* @__PURE__ */ new Map();
  }
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.split("/").filter(Boolean);
    switch (path[0]) {
      case "session":
        return this.handleSession(request, path[1]);
      case "billing-cycle":
        return this.handleBillingCycle(request, path[1]);
      default:
        return new Response("Not found", { status: 404 });
    }
  }
  async handleSession(request, customerId) {
    if (request.method === "POST") {
      this.customerSessions.set(customerId, { lastActive: Date.now() });
      await this.state.storage.put(`session:${customerId}`, Date.now());
      return new Response("Session updated", { status: 200 });
    } else if (request.method === "GET") {
      const session = this.customerSessions.get(customerId) || { lastActive: await this.state.storage.get(`session:${customerId}`) };
      return new Response(JSON.stringify(session), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("Method not allowed", { status: 405 });
  }
  async handleBillingCycle(request, customerId) {
    if (request.method === "POST") {
      const data = await request.json();
      this.billingCycles.set(customerId, { startDate: data.startDate, endDate: data.endDate });
      await this.state.storage.put(`billing:${customerId}`, { startDate: data.startDate, endDate: data.endDate });
      return new Response("Billing cycle updated", { status: 200 });
    } else if (request.method === "GET") {
      const cycle = this.billingCycles.get(customerId) || await this.state.storage.get(`billing:${customerId}`);
      return new Response(JSON.stringify(cycle), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("Method not allowed", { status: 405 });
  }
};

// src/index.ts
var src_default = {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const kvService = new KVService(env);
      const emailService = new EmailService(env.SENDGRID_API_KEY, env.FROM_EMAIL);
      if (url.pathname.startsWith("/billing-do/")) {
        return handleBillingDO(request, env);
      }
      switch (url.pathname) {
        case "/subscription":
          return handleSubscription(request, kvService);
        case "/invoice":
          return handleInvoice(request, kvService, emailService);
        case "/customer":
          return handleCustomer(request, kvService, env.BILLING_DO);
        case "/subscription-plan":
          return handleSubscriptionPlan(request, kvService);
        case "/payment":
          return handlePayment(request, kvService, emailService);
        case "/billing":
          return handleBilling(request, kvService, emailService, env.BILLING_DO);
        case "/payment-retry":
          return handlePaymentRetry(kvService, emailService);
        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      return handleError(error);
    }
  },
  async scheduled(event, env, ctx) {
    try {
      const kvService = new KVService(env);
      const emailService = new EmailService(env.SENDGRID_API_KEY, env.FROM_EMAIL);
      switch (event.cron) {
        case "0 0 * * *":
          await handleBilling(new Request("https://dummy-url/billing", { method: "GET" }), kvService, emailService, env.BILLING_DO);
          break;
        case "0 */4 * * *":
          await handlePaymentRetry(kvService, emailService);
          break;
      }
    } catch (error) {
      console.error("Scheduled task error:", error);
    }
  }
};
async function handleBillingDO(request, env) {
  try {
    const url = new URL(request.url);
    const customerId = url.pathname.split("/")[2];
    const id = env.BILLING_DO.idFromName(customerId);
    const obj = env.BILLING_DO.get(id);
    return obj.fetch(request);
  } catch (error) {
    return handleError(error);
  }
}

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
};
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
var jsonError = async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
};
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-t5EvaK/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}

// .wrangler/tmp/bundle-t5EvaK/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  };
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      };
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  BillingDO,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
