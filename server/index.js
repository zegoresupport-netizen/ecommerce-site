import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import Stripe from 'stripe';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_REGISTRATION_ENABLED = process.env.ALLOW_ADMIN_REGISTRATION === 'true';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
const STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL ?? '';
const STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL ?? '';
const SHIPROCKET_BASE_URL = process.env.SHIPROCKET_BASE_URL ?? 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL ?? '';
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD ?? '';
const SHIPROCKET_PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary';
const DEMO_MODE = String(process.env.DEMO_MODE ?? 'true').toLowerCase() === 'true';
const allowedOrigins = String(process.env.ALLOWED_ORIGINS ?? process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Add it to your .env file.');
}

const stripeClient = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil',
    })
  : null;

let shiprocketTokenCache = {
  token: '',
  expiresAt: 0,
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDirPath = path.join(__dirname, 'data');
const inventoryFilePath = path.join(dataDirPath, 'inventory.json');
const productsFilePath = path.join(dataDirPath, 'products.json');
const ordersFilePath = path.join(dataDirPath, 'orders.json');
const customersFilePath = path.join(dataDirPath, 'customers.json');
const adminUsersFilePath = path.join(dataDirPath, 'admin-users.json');

const productSchema = z.object({
  id: z.number().int().positive(),
  sku: z.string().trim().min(2).max(30).optional(),
  name: z.string().trim().min(2).max(120),
  price: z.number().nonnegative(),
  category: z.string().trim().min(2).max(60),
  stock: z.number().int().nonnegative().optional(),
  image: z.string().trim().min(1),
  description: z.string().trim().min(10).max(240),
  longDescription: z.string().trim().min(30).max(3000),
});

const productCreateSchema = productSchema.omit({ id: true });

const productUpdateSchema = productCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided for update'
);

const inventoryItemSchema = z.object({
  sku: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  unitPrice: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  supplier: z.string().trim().min(2).max(120),
});

const inventoryUpdateSchema = inventoryItemSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided for update'
);

const adjustStockSchema = z.object({
  quantityChange: z.number().int(),
  reason: z.string().trim().min(2).max(200),
});

const orderStatusEnum = z.enum(['Paid', 'Pending', 'Shipped', 'Cancelled']);

const orderItemSchema = z
  .object({
    productId: z.number().int().positive().optional(),
    sku: z.string().trim().min(2).max(30).optional(),
    name: z.string().trim().min(1).max(160).optional(),
    price: z.number().nonnegative().optional(),
    weight: z.number().positive().optional(),
    quantity: z.number().int().positive(),
  })
  .refine((value) => Boolean(value.sku || value.productId), 'Each order item must include sku or productId');

const checkoutCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(4).max(240),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().min(3).max(12),
  country: z.string().trim().min(2).max(80).default('India'),
});

const checkoutItemSchema = z
  .object({
    productId: z.number().int().positive().optional(),
    sku: z.string().trim().min(2).max(30).optional(),
    name: z.string().trim().min(1).max(160),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    weight: z.number().positive().optional(),
  })
  .refine((value) => Boolean(value.sku || value.productId), 'Each checkout item must include sku or productId');

const createCheckoutSessionSchema = z.object({
  customer: checkoutCustomerSchema,
  items: z.array(checkoutItemSchema).min(1),
  currency: z.string().trim().min(3).max(3).optional().default('inr'),
  successUrl: z.string().trim().url().optional(),
  cancelUrl: z.string().trim().url().optional(),
});

const orderCreateSchema = z.object({
  customer: z.string().trim().min(2).max(120),
  customerEmail: z.email().optional(),
  total: z.number().nonnegative(),
  status: orderStatusEnum,
  itemCount: z.number().int().nonnegative(),
  items: z.array(orderItemSchema).optional(),
});

const orderUpdateSchema = orderCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided for update'
);

const customerCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  orders: z.number().int().nonnegative().optional().default(0),
  spend: z.number().nonnegative().optional().default(0),
});

const customerUpdateSchema = customerCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided for update'
);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(
  express.json({
    verify: (request, _response, buffer) => {
      if (request.originalUrl === '/webhook/stripe') {
        request.rawBody = buffer;
      }
    },
  })
);

const ensureJsonDataFile = async (filePath) => {
  await fs.mkdir(dataDirPath, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]', 'utf8');
  }
};

const readJsonArray = async (filePath) => {
  await ensureJsonDataFile(filePath);
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
};

const writeJsonArray = async (filePath, items) => {
  await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf8');
};

const readInventory = async () => {
  return readJsonArray(inventoryFilePath);
};

const readProducts = async () => {
  return readJsonArray(productsFilePath);
};

const writeProducts = async (items) => {
  await writeJsonArray(productsFilePath, items);
};

const writeInventory = async (items) => {
  await writeJsonArray(inventoryFilePath, items);
};

const readOrders = async () => {
  return readJsonArray(ordersFilePath);
};

const writeOrders = async (items) => {
  await writeJsonArray(ordersFilePath, items);
};

const readCustomers = async () => {
  return readJsonArray(customersFilePath);
};

const readAdminUsers = async () => {
  return readJsonArray(adminUsersFilePath);
};

const writeCustomers = async (items) => {
  await writeJsonArray(customersFilePath, items);
};

const writeAdminUsers = async (items) => {
  await writeJsonArray(adminUsersFilePath, items);
};

const createNextId = (items, prefix) => {
  const maxId = items.reduce((currentMax, item) => {
    if (!item?.id || typeof item.id !== 'string') {
      return currentMax;
    }

    if (!item.id.startsWith(`${prefix}-`)) {
      return currentMax;
    }

    const parsedId = Number(item.id.replace(`${prefix}-`, ''));
    return Number.isNaN(parsedId) ? currentMax : Math.max(currentMax, parsedId);
  }, 0);

  return `${prefix}-${String(maxId + 1).padStart(4, '0')}`;
};

const createAuthToken = (adminUser) => {
  return jwt.sign(
    {
      sub: adminUser.id,
      email: adminUser.email,
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
};

const authMiddleware = (request, response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    response.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    request.auth = decoded;
    next();
  } catch {
    response.status(401).json({ message: 'Invalid or expired token' });
  }
};

const ensureStripeConfigured = () => {
  if (!stripeClient) {
    const error = new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env');
    error.statusCode = 503;
    throw error;
  }

  if (!STRIPE_SUCCESS_URL || !STRIPE_CANCEL_URL) {
    const error = new Error('Stripe redirect URLs are missing. Set STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL in .env');
    error.statusCode = 400;
    throw error;
  }
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomToken = (prefix) => {
  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}_${randomPart}`;
};

const resolveOrderSku = (item, products) => {
  if (item.sku) {
    return item.sku.trim();
  }

  if (item.productId) {
    const matchingProduct = products.find((product) => Number(product.id) === Number(item.productId));
    return matchingProduct?.sku?.trim() ?? '';
  }

  return '';
};

const validateAndDeductStockForItems = async (orderItems) => {
  if (!orderItems || orderItems.length === 0) {
    return;
  }

  const products = await readProducts();
  const inventoryItems = await readInventory();

  const deductions = orderItems.map((item) => ({
    ...item,
    resolvedSku: resolveOrderSku(item, products),
  }));

  const invalidItem = deductions.find((item) => !item.resolvedSku);
  if (invalidItem) {
    throw new Error('Unable to resolve SKU for one or more order items');
  }

  for (const item of deductions) {
    const inventoryIndex = inventoryItems.findIndex(
      (inventoryItem) => inventoryItem.sku.toLowerCase() === item.resolvedSku.toLowerCase()
    );

    if (inventoryIndex === -1) {
      throw new Error(`Inventory item not found for SKU ${item.resolvedSku}`);
    }

    const availableStock = Number(inventoryItems[inventoryIndex].stock ?? 0);
    if (availableStock < item.quantity) {
      throw new Error(`Insufficient stock for SKU ${item.resolvedSku}. Available: ${availableStock}`);
    }
  }

  for (const item of deductions) {
    const inventoryIndex = inventoryItems.findIndex(
      (inventoryItem) => inventoryItem.sku.toLowerCase() === item.resolvedSku.toLowerCase()
    );

    inventoryItems[inventoryIndex] = {
      ...inventoryItems[inventoryIndex],
      stock: Number(inventoryItems[inventoryIndex].stock ?? 0) - item.quantity,
      updatedAt: new Date().toISOString(),
    };
  }

  await writeInventory(inventoryItems);

  const nextProducts = products.map((product) => {
    if (!product?.sku) {
      return product;
    }

    const purchasedItem = deductions.find(
      (item) => item.resolvedSku.toLowerCase() === String(product.sku).toLowerCase()
    );

    if (!purchasedItem) {
      return product;
    }

    return {
      ...product,
      stock: Math.max(0, Number(product.stock ?? 0) - purchasedItem.quantity),
    };
  });

  await writeProducts(nextProducts);
};

const upsertCustomerFromOrder = async ({ name, email, orderTotal }) => {
  if (!email) {
    return;
  }

  const customers = await readCustomers();
  const normalizedEmail = email.toLowerCase();
  const existingIndex = customers.findIndex((customer) => customer.email.toLowerCase() === normalizedEmail);

  if (existingIndex >= 0) {
    const existingCustomer = customers[existingIndex];
    customers[existingIndex] = {
      ...existingCustomer,
      name,
      orders: Number(existingCustomer.orders ?? 0) + 1,
      spend: Number(existingCustomer.spend ?? 0) + Number(orderTotal ?? 0),
      updatedAt: new Date().toISOString(),
    };
  } else {
    customers.unshift({
      id: createNextId(customers, 'CUST'),
      name,
      email,
      orders: 1,
      spend: Number(orderTotal ?? 0),
      updatedAt: new Date().toISOString(),
    });
  }

  await writeCustomers(customers);
};

const getShiprocketToken = async () => {
  const now = Date.now();
  if (shiprocketTokenCache.token && shiprocketTokenCache.expiresAt > now) {
    return shiprocketTokenCache.token;
  }

  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    throw new Error('Shiprocket credentials are not configured');
  }

  const authResponse = await axios.post(
    `${SHIPROCKET_BASE_URL}/auth/login`,
    {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD,
    },
    {
      timeout: 15000,
    }
  );

  const token = authResponse.data?.token;
  if (!token) {
    throw new Error('Shiprocket auth token missing in response');
  }

  shiprocketTokenCache = {
    token,
    expiresAt: now + 9 * 60 * 1000,
  };

  return token;
};

const createShiprocketShipment = async (order) => {
  const token = await getShiprocketToken();
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const customerDetails = order.customerDetails ?? {};

  const [firstName, ...rest] = String(customerDetails.name ?? order.customer ?? 'Customer').trim().split(' ');
  const lastName = rest.join(' ') || '.';

  const payload = {
    order_id: order.id,
    order_date: new Date().toISOString().slice(0, 10),
    pickup_location: SHIPROCKET_PICKUP_LOCATION,
    billing_customer_name: firstName || 'Customer',
    billing_last_name: lastName,
    billing_address: customerDetails.address ?? 'Address not provided',
    billing_city: customerDetails.city ?? 'Unknown',
    billing_pincode: customerDetails.pincode ?? '000000',
    billing_state: customerDetails.state ?? 'Unknown',
    billing_country: customerDetails.country ?? 'India',
    billing_email: customerDetails.email ?? order.customerEmail ?? 'unknown@example.com',
    billing_phone: customerDetails.phone ?? '9999999999',
    shipping_is_billing: true,
    order_items: orderItems.map((item, index) => ({
      name: item.name ?? `Item ${index + 1}`,
      sku: item.sku ?? `PID-${item.productId ?? index + 1}`,
      units: Number(item.quantity ?? 1),
      selling_price: Number(item.price ?? 0),
      discount: 0,
      tax: 0,
    })),
    payment_method: 'Prepaid',
    sub_total: Number(order.total ?? 0),
    length: 10,
    breadth: 10,
    height: 10,
    weight: orderItems.reduce((sum, item) => sum + Number(item.weight ?? 0.5) * Number(item.quantity ?? 1), 0),
  };

  const response = await axios.post(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });

  const responseData = response.data ?? {};

  return {
    shipmentId: responseData.shipment_id ?? null,
    trackingId: responseData.awb_code ?? responseData.tracking_number ?? null,
    courierName: responseData.courier_name ?? responseData.channel_id ?? null,
    raw: responseData,
  };
};

const createShiprocketShipmentWithRetry = async (order, maxAttempts = 2) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await createShiprocketShipment(order);
    } catch (error) {
      lastError = error;
      console.error(`Shiprocket create shipment failed (attempt ${attempt}/${maxAttempts})`, error);
      if (attempt < maxAttempts) {
        await pause(1000 * attempt);
      }
    }
  }

  throw lastError ?? new Error('Shiprocket shipment creation failed');
};

const logisticsService = {
  demo: {
    createShipment: async () => {
      return {
        shipmentId: randomToken('DEMO'),
        trackingId: randomToken('TRACK'),
        courierName: 'DemoCourier',
        raw: { mode: 'demo' },
      };
    },
  },
  live: {
    createShipment: async (order) => {
      return createShiprocketShipmentWithRetry(order, 2);
    },
  },
};

const selectedLogisticsService = DEMO_MODE ? logisticsService.demo : logisticsService.live;

const finalizeOrderAfterSuccessfulPayment = async ({ orderId, sessionId, paymentStatus }) => {
  const orders = await readOrders();
  const orderIndex = orders.findIndex(
    (order) => order.id === orderId || (sessionId && order.stripeSessionId === sessionId)
  );

  if (orderIndex === -1) {
    throw new Error('Order not found for payment finalization');
  }

  const existingOrder = orders[orderIndex];
  if (existingOrder.paymentStatus === 'PAID') {
    return existingOrder;
  }

  await validateAndDeductStockForItems(existingOrder.items ?? []);

  const nextOrder = {
    ...existingOrder,
    status: 'Paid',
    paymentStatus: 'PAID',
    orderStatus: 'CONFIRMED',
    stripeSessionId: sessionId ?? existingOrder.stripeSessionId ?? null,
    stripePaymentStatus: paymentStatus ?? 'paid',
    updatedAt: new Date().toISOString(),
  };

  await upsertCustomerFromOrder({
    name: nextOrder.customer,
    email: nextOrder.customerDetails?.email ?? nextOrder.customerEmail,
    orderTotal: nextOrder.total,
  });

  try {
    const shipment = await selectedLogisticsService.createShipment(nextOrder);
    nextOrder.orderStatus = 'SHIPPED';
    nextOrder.shipment = {
      status: 'CREATED',
      shipmentId: shipment.shipmentId,
      trackingId: shipment.trackingId,
      courierName: shipment.courierName,
      createdAt: new Date().toISOString(),
      raw: shipment.raw,
    };
  } catch (shipmentError) {
    nextOrder.orderStatus = 'CONFIRMED';
    nextOrder.shipment = {
      status: 'FAILED',
      error: shipmentError instanceof Error ? shipmentError.message : 'Shipment creation failed',
      createdAt: new Date().toISOString(),
    };
  }

  orders[orderIndex] = nextOrder;
  await writeOrders(orders);

  return nextOrder;
};

app.post('/create-checkout-session', async (request, response, next) => {
  try {
    const parsed = createCheckoutSessionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid checkout payload', issues: parsed.error.issues });
      return;
    }

    const payload = parsed.data;
    const total = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderItems = payload.items.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      weight: item.weight,
    }));

    const orders = await readOrders();
    const nextOrder = {
      id: createNextId(orders, 'ORD'),
      customer: payload.customer.name,
      customerEmail: payload.customer.email,
      customerDetails: payload.customer,
      total,
      status: 'Pending',
      orderStatus: 'PENDING',
      paymentStatus: 'PENDING',
      stripePaymentStatus: 'unpaid',
      stripeSessionId: null,
      itemCount: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      items: orderItems,
      shipment: null,
      updatedAt: new Date().toISOString(),
    };

    orders.unshift(nextOrder);
    await writeOrders(orders);

    const paymentService = {
      demo: {
        processCheckout: async () => {
          const finalized = await finalizeOrderAfterSuccessfulPayment({
            orderId: nextOrder.id,
            sessionId: randomToken('DEMO_SESSION'),
            paymentStatus: 'paid',
          });

          return {
            mode: 'demo',
            orderId: finalized.id,
            paymentStatus: finalized.paymentStatus,
            orderStatus: finalized.orderStatus,
            shipmentId: finalized.shipment?.shipmentId ?? null,
            trackingId: finalized.shipment?.trackingId ?? null,
            courierName: finalized.shipment?.courierName ?? null,
            message: 'Payment & shipping simulated for demo',
          };
        },
      },
      live: {
        processCheckout: async () => {
          ensureStripeConfigured();

          const session = await stripeClient.checkout.sessions.create({
            mode: 'payment',
            customer_email: payload.customer.email,
            line_items: payload.items.map((item) => ({
              quantity: item.quantity,
              price_data: {
                currency: payload.currency.toLowerCase(),
                product_data: {
                  name: item.name,
                  metadata: {
                    sku: item.sku ?? '',
                    productId: item.productId ? String(item.productId) : '',
                  },
                },
                unit_amount: Math.round(item.price * 100),
              },
            })),
            metadata: {
              orderId: nextOrder.id,
            },
            success_url: `${payload.successUrl ?? STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}&order_id=${nextOrder.id}`,
            cancel_url: payload.cancelUrl ?? STRIPE_CANCEL_URL,
          });

          const refreshedOrders = await readOrders();
          const orderIndex = refreshedOrders.findIndex((item) => item.id === nextOrder.id);
          if (orderIndex >= 0) {
            refreshedOrders[orderIndex] = {
              ...refreshedOrders[orderIndex],
              stripeSessionId: session.id,
            };
            await writeOrders(refreshedOrders);
          }

          return {
            mode: 'live',
            orderId: nextOrder.id,
            sessionId: session.id,
            checkoutUrl: session.url,
          };
        },
      },
    };

    if (DEMO_MODE) {
      const demoResult = await paymentService.demo.processCheckout();
      response.status(201).json(demoResult);
      return;
    }

    const liveResult = await paymentService.live.processCheckout();
    response.status(201).json(liveResult);
  } catch (error) {
    next(error);
  }
});

app.post('/webhook/stripe', async (request, response, next) => {
  try {
    if (DEMO_MODE) {
      response.status(200).json({ received: true, skipped: true, mode: 'demo' });
      return;
    }

    if (!stripeClient || !STRIPE_WEBHOOK_SECRET) {
      response.status(503).json({ message: 'Stripe webhook is not configured' });
      return;
    }

    const signature = request.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      response.status(400).json({ message: 'Missing Stripe signature header' });
      return;
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      response.status(400).json({ message: 'Missing raw webhook body' });
      return;
    }

    const event = stripeClient.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await finalizeOrderAfterSuccessfulPayment({
          orderId,
          sessionId: session.id,
          paymentStatus: session.payment_status,
        });
      }
    }

    response.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

app.get('/order/:id', async (request, response, next) => {
  try {
    const orderId = String(request.params.id ?? '').trim();
    const orders = await readOrders();
    const order = orders.find((item) => item.id === orderId);

    if (!order) {
      response.status(404).json({ message: 'Order not found' });
      return;
    }

    response.status(200).json({
      id: order.id,
      orderStatus: order.orderStatus ?? order.status ?? 'PENDING',
      paymentStatus: order.paymentStatus ?? 'PENDING',
      stripeSessionId: order.stripeSessionId ?? null,
      trackingId: order.shipment?.trackingId ?? null,
      courierName: order.shipment?.courierName ?? null,
      shipmentId: order.shipment?.shipmentId ?? null,
      shipmentStatus: order.shipment?.status ?? 'NOT_CREATED',
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/register', async (request, response, next) => {
  try {
    if (!ADMIN_REGISTRATION_ENABLED) {
      response.status(403).json({ message: 'Admin registration is disabled' });
      return;
    }

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid registration payload', issues: parsed.error.issues });
      return;
    }

    const users = await readAdminUsers();
    const existingUser = users.find((user) => user.email.toLowerCase() === parsed.data.email.toLowerCase());

    if (existingUser) {
      response.status(409).json({ message: 'Admin email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const nextUser = {
      id: createNextId(users, 'ADMIN'),
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(nextUser);
    await writeAdminUsers(users);

    response.status(201).json({
      message: 'Admin account created',
      admin: {
        id: nextUser.id,
        name: nextUser.name,
        email: nextUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post('/login', async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid login payload', issues: parsed.error.issues });
      return;
    }

    const users = await readAdminUsers();
    const adminUser = users.find((user) => user.email.toLowerCase() === parsed.data.email.toLowerCase());

    if (!adminUser) {
      response.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isValidPassword = await bcrypt.compare(parsed.data.password, adminUser.passwordHash);
    if (!isValidPassword) {
      response.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = createAuthToken(adminUser);

    response.status(200).json({
      token,
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/auth/me', authMiddleware, (request, response) => {
  const auth = request.auth;
  response.status(200).json({
    id: auth?.sub,
    email: auth?.email,
    role: auth?.role,
  });
});

app.get('/api/health', (_request, response) => {
  response.status(200).json({ ok: true, service: 'admin-api' });
});

app.get('/api/products', async (request, response, next) => {
  try {
    const items = await readProducts();
    const search = String(request.query.search ?? '').trim().toLowerCase();
    const category = String(request.query.category ?? '').trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (search) {
        const inSearch =
          item.name.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          item.longDescription.toLowerCase().includes(search);
        if (!inSearch) return false;
      }

      if (category && item.category.toLowerCase() !== category) {
        return false;
      }

      return true;
    });

    response.status(200).json({ count: filtered.length, items: filtered });
  } catch (error) {
    next(error);
  }
});

const buildProductPerformance = async () => {
  const [products, orders] = await Promise.all([readProducts(), readOrders()]);

  const performanceMap = new Map();

  const findProductFromItem = (item) => {
    if (item.sku) {
      const bySku = products.find((product) => String(product.sku ?? '').toLowerCase() === String(item.sku).toLowerCase());
      if (bySku) return bySku;
    }

    if (item.productId) {
      const byId = products.find((product) => Number(product.id) === Number(item.productId));
      if (byId) return byId;
    }

    if (item.name) {
      return products.find((product) => String(product.name).toLowerCase() === String(item.name).toLowerCase()) ?? null;
    }

    return null;
  };

  for (const order of orders) {
    const orderItems = Array.isArray(order.items) ? order.items : [];

    for (const item of orderItems) {
      const matchedProduct = findProductFromItem(item);
      const key = String(item.sku ?? item.productId ?? item.name ?? matchedProduct?.id ?? '').toLowerCase();

      if (!key) {
        continue;
      }

      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.price ?? matchedProduct?.price ?? 0);
      const revenue = unitPrice * quantity;

      if (!performanceMap.has(key)) {
        performanceMap.set(key, {
          id: matchedProduct?.id ?? item.productId ?? null,
          sku: matchedProduct?.sku ?? item.sku ?? null,
          name: matchedProduct?.name ?? item.name ?? 'Product',
          price: Number(matchedProduct?.price ?? unitPrice ?? 0),
          image: matchedProduct?.image ?? '',
          totalSold: 0,
          revenue: 0,
        });
      }

      const entry = performanceMap.get(key);
      entry.totalSold += quantity;
      entry.revenue += revenue;
    }
  }

  return Array.from(performanceMap.values());
};

app.get('/api/products/best-sellers', async (_request, response, next) => {
  try {
    const performance = await buildProductPerformance();
    const items = performance
      .filter((item) => item.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 12);

    response.status(200).json({ count: items.length, items });
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/top-purchases', async (_request, response, next) => {
  try {
    const performance = await buildProductPerformance();
    const items = performance
      .filter((item) => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 12);

    response.status(200).json({ count: items.length, items });
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:id', async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    if (Number.isNaN(id)) {
      response.status(400).json({ message: 'Invalid product id' });
      return;
    }

    const items = await readProducts();
    const item = items.find((product) => product.id === id);

    if (!item) {
      response.status(404).json({ message: 'Product not found' });
      return;
    }

    const parsed = productSchema.safeParse(item);
    if (!parsed.success) {
      response.status(500).json({ message: 'Product data schema validation failed' });
      return;
    }

    response.status(200).json(parsed.data);
  } catch (error) {
    next(error);
  }
});

app.post(['/api/products', '/api/products/add'], authMiddleware, async (request, response, next) => {
  try {
    const parsed = productCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid product payload', issues: parsed.error.issues });
      return;
    }

    const items = await readProducts();
    const inventoryItems = await readInventory();
    const nextId = items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;
    const requestedSku = parsed.data.sku?.trim();
    let sku = requestedSku || `PRD-${String(nextId).padStart(4, '0')}`;

    if (inventoryItems.some((item) => item.sku.toLowerCase() === sku.toLowerCase())) {
      if (requestedSku) {
        response.status(409).json({ message: 'SKU already exists in inventory' });
        return;
      }

      const baseSku = sku;
      let suffix = 1;
      while (inventoryItems.some((item) => item.sku.toLowerCase() === sku.toLowerCase())) {
        sku = `${baseSku}-${suffix}`;
        suffix += 1;
      }
    }

    const nextProduct = {
      id: nextId,
      ...parsed.data,
      sku,
      stock: parsed.data.stock ?? 0,
    };

    items.push(nextProduct);
    await writeProducts(items);

    inventoryItems.push({
      sku,
      name: nextProduct.name,
      category: nextProduct.category,
      unitPrice: nextProduct.price,
      stock: nextProduct.stock ?? 0,
      reorderLevel: 5,
      supplier: 'Catalog Auto Sync',
      updatedAt: new Date().toISOString(),
    });

    await writeInventory(inventoryItems);

    response.status(201).json(nextProduct);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/products/:id', authMiddleware, async (request, response, next) => {
  try {
    const parsed = productUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid product update payload', issues: parsed.error.issues });
      return;
    }

    const id = Number(request.params.id);
    if (Number.isNaN(id)) {
      response.status(400).json({ message: 'Invalid product id' });
      return;
    }

    const items = await readProducts();
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      response.status(404).json({ message: 'Product not found' });
      return;
    }

    const updated = {
      ...items[index],
      ...parsed.data,
    };

    const schemaCheck = productSchema.safeParse(updated);
    if (!schemaCheck.success) {
      response.status(400).json({ message: 'Updated product is invalid', issues: schemaCheck.error.issues });
      return;
    }

    items[index] = schemaCheck.data;
    await writeProducts(items);

    response.status(200).json(schemaCheck.data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/inventory', authMiddleware, async (request, response, next) => {
  try {
    const items = await readInventory();
    const search = String(request.query.search ?? '').trim().toLowerCase();
    const category = String(request.query.category ?? '').trim().toLowerCase();
    const lowStockOnly = String(request.query.lowStock ?? '').toLowerCase() === 'true';

    const filtered = items.filter((item) => {
      if (search) {
        const inSearch =
          item.name.toLowerCase().includes(search) ||
          item.sku.toLowerCase().includes(search) ||
          item.supplier.toLowerCase().includes(search);
        if (!inSearch) return false;
      }

      if (category && item.category.toLowerCase() !== category) {
        return false;
      }

      if (lowStockOnly && item.stock > item.reorderLevel) {
        return false;
      }

      return true;
    });

    response.status(200).json({ count: filtered.length, items: filtered });
  } catch (error) {
    next(error);
  }
});

app.get('/api/inventory/:sku', authMiddleware, async (request, response, next) => {
  try {
    const sku = request.params.sku.trim().toLowerCase();
    const items = await readInventory();
    const item = items.find((inventoryItem) => inventoryItem.sku.toLowerCase() === sku);

    if (!item) {
      response.status(404).json({ message: 'Inventory item not found' });
      return;
    }

    response.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

app.post('/api/inventory', authMiddleware, async (request, response, next) => {
  try {
    const parsed = inventoryItemSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid inventory item', issues: parsed.error.issues });
      return;
    }

    const items = await readInventory();
    const exists = items.some((item) => item.sku.toLowerCase() === parsed.data.sku.toLowerCase());

    if (exists) {
      response.status(409).json({ message: 'SKU already exists' });
      return;
    }

    const newItem = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    items.push(newItem);
    await writeInventory(items);

    response.status(201).json(newItem);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/inventory/:sku', authMiddleware, async (request, response, next) => {
  try {
    const parsed = inventoryUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid inventory update', issues: parsed.error.issues });
      return;
    }

    const sku = request.params.sku.trim().toLowerCase();
    const items = await readInventory();
    const index = items.findIndex((item) => item.sku.toLowerCase() === sku);

    if (index === -1) {
      response.status(404).json({ message: 'Inventory item not found' });
      return;
    }

    const updated = {
      ...items[index],
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    await writeInventory(items);

    response.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

app.post('/api/inventory/:sku/adjust', authMiddleware, async (request, response, next) => {
  try {
    const parsed = adjustStockSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid stock adjustment', issues: parsed.error.issues });
      return;
    }

    const sku = request.params.sku.trim().toLowerCase();
    const items = await readInventory();
    const index = items.findIndex((item) => item.sku.toLowerCase() === sku);

    if (index === -1) {
      response.status(404).json({ message: 'Inventory item not found' });
      return;
    }

    const nextStock = items[index].stock + parsed.data.quantityChange;
    if (nextStock < 0) {
      response.status(400).json({ message: 'Stock cannot be negative' });
      return;
    }

    const updated = {
      ...items[index],
      stock: nextStock,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    await writeInventory(items);

    response.status(200).json({
      message: 'Stock updated',
      reason: parsed.data.reason,
      item: updated,
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/inventory/:sku', authMiddleware, async (request, response, next) => {
  try {
    const sku = request.params.sku.trim().toLowerCase();
    const items = await readInventory();
    const targetItem = items.find((item) => item.sku.toLowerCase() === sku);
    const nextItems = items.filter((item) => item.sku.toLowerCase() !== sku);

    if (!targetItem) {
      response.status(404).json({ message: 'Inventory item not found' });
      return;
    }

    await writeInventory(nextItems);

    const products = await readProducts();
    const nextProducts = products.filter((product) => {
      const matchesSku =
        typeof product.sku === 'string' && product.sku.toLowerCase() === sku;

      const matchesLegacyMapping =
        product.name === targetItem.name &&
        product.category === targetItem.category &&
        Number(product.price) === Number(targetItem.unitPrice);

      return !(matchesSku || matchesLegacyMapping);
    });

    if (nextProducts.length !== products.length) {
      await writeProducts(nextProducts);
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders', authMiddleware, async (request, response, next) => {
  try {
    const items = await readOrders();
    const search = String(request.query.search ?? '').trim().toLowerCase();
    const status = String(request.query.status ?? '').trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (search) {
        const inSearch =
          item.id.toLowerCase().includes(search) ||
          item.customer.toLowerCase().includes(search);
        if (!inSearch) return false;
      }

      if (status && item.status.toLowerCase() !== status) {
        return false;
      }

      return true;
    });

    response.status(200).json({ count: filtered.length, items: filtered });
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (request, response, next) => {
  try {
    const parsed = orderCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid order payload', issues: parsed.error.issues });
      return;
    }

    if (parsed.data.items && parsed.data.items.length > 0) {
      await validateAndDeductStockForItems(parsed.data.items);
    }

    const items = await readOrders();
    const isPaid = parsed.data.status === 'Paid';
    const nextOrder = {
      id: createNextId(items, 'ORD'),
      ...parsed.data,
      orderStatus: isPaid ? 'CONFIRMED' : 'PENDING',
      paymentStatus: isPaid ? 'PAID' : 'PENDING',
      stripePaymentStatus: isPaid ? 'paid' : 'manual',
      stripeSessionId: null,
      shipment: null,
      updatedAt: new Date().toISOString(),
    };

    items.unshift(nextOrder);
    await writeOrders(items);

    await upsertCustomerFromOrder({
      name: parsed.data.customer,
      email: parsed.data.customerEmail,
      orderTotal: parsed.data.total,
    });

    response.status(201).json(nextOrder);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/orders/:id', authMiddleware, async (request, response, next) => {
  try {
    const parsed = orderUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid order update payload', issues: parsed.error.issues });
      return;
    }

    const orderId = request.params.id.trim().toLowerCase();
    const items = await readOrders();
    const index = items.findIndex((item) => item.id.toLowerCase() === orderId);

    if (index === -1) {
      response.status(404).json({ message: 'Order not found' });
      return;
    }

    const updated = {
      ...items[index],
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    await writeOrders(items);

    response.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/orders/:id', authMiddleware, async (request, response, next) => {
  try {
    const orderId = request.params.id.trim().toLowerCase();
    const items = await readOrders();
    const nextItems = items.filter((item) => item.id.toLowerCase() !== orderId);

    if (nextItems.length === items.length) {
      response.status(404).json({ message: 'Order not found' });
      return;
    }

    await writeOrders(nextItems);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/customers', authMiddleware, async (request, response, next) => {
  try {
    const items = await readCustomers();
    const search = String(request.query.search ?? '').trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (!search) {
        return true;
      }

      return (
        item.id.toLowerCase().includes(search) ||
        item.name.toLowerCase().includes(search) ||
        item.email.toLowerCase().includes(search)
      );
    });

    response.status(200).json({ count: filtered.length, items: filtered });
  } catch (error) {
    next(error);
  }
});

app.post('/api/customers', authMiddleware, async (request, response, next) => {
  try {
    const parsed = customerCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid customer payload', issues: parsed.error.issues });
      return;
    }

    const items = await readCustomers();
    const exists = items.some((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (exists) {
      response.status(409).json({ message: 'Customer email already exists' });
      return;
    }

    const nextCustomer = {
      id: createNextId(items, 'CUST'),
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    items.unshift(nextCustomer);
    await writeCustomers(items);

    response.status(201).json(nextCustomer);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/customers/:id', authMiddleware, async (request, response, next) => {
  try {
    const parsed = customerUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: 'Invalid customer update payload', issues: parsed.error.issues });
      return;
    }

    const customerId = request.params.id.trim().toLowerCase();
    const items = await readCustomers();
    const index = items.findIndex((item) => item.id.toLowerCase() === customerId);

    if (index === -1) {
      response.status(404).json({ message: 'Customer not found' });
      return;
    }

    if (parsed.data.email) {
      const duplicateEmail = items.some(
        (item, itemIndex) => itemIndex !== index && item.email.toLowerCase() === parsed.data.email.toLowerCase()
      );
      if (duplicateEmail) {
        response.status(409).json({ message: 'Customer email already exists' });
        return;
      }
    }

    const updated = {
      ...items[index],
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    await writeCustomers(items);

    response.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/customers/:id', authMiddleware, async (request, response, next) => {
  try {
    const customerId = request.params.id.trim().toLowerCase();
    const items = await readCustomers();
    const nextItems = items.filter((item) => item.id.toLowerCase() !== customerId);

    if (nextItems.length === items.length) {
      response.status(404).json({ message: 'Customer not found' });
      return;
    }

    await writeCustomers(nextItems);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);

  if (error?.type === 'StripeSignatureVerificationError') {
    response.status(400).json({ message: 'Invalid Stripe webhook signature' });
    return;
  }

  if (error?.statusCode) {
    response.status(error.statusCode).json({ message: error.message || 'Request failed' });
    return;
  }

  response.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Admin API server running on http://localhost:${PORT}`);
});
