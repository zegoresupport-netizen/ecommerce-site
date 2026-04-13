# Admin Backend (Prototype)

This is a starter backend API for inventory, orders, and customers.

## Environment variables

Create `.env` in the app root (example in `.env.example`):

```bash
API_PORT=4000
PORT=4000
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
ALLOW_ADMIN_REGISTRATION=false
DEMO_MODE=true
VITE_DEMO_MODE=true
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUCCESS_URL=http://localhost:5173/
STRIPE_CANCEL_URL=http://localhost:5173/
SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in/v1/external
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
SHIPROCKET_PICKUP_LOCATION=Primary
```

- `JWT_SECRET` is required to sign/verify admin JWTs.
- `PORT` is used by Render. Keep `API_PORT` for local/dev compatibility.
- `CLIENT_ORIGIN` (or `ALLOWED_ORIGINS`) controls CORS. For production, set it to your Netlify site URL.
- `ALLOWED_ORIGINS` accepts comma-separated origins when you have multiple frontends.
- `ALLOW_ADMIN_REGISTRATION` should be `true` only while creating your first admin account, then set back to `false`.
- Stripe + Shiprocket keys are required for payment-to-logistics automation.

## Demo vs Live mode

- `DEMO_MODE=true`:
  - Checkout does not call Stripe.
  - Order is auto-marked `PAID` and `SHIPPED`.
  - Shipment is simulated (`DEMO_*`, `TRACK_*`, `DemoCourier`).
  - Stripe webhook processing is skipped.

- `DEMO_MODE=false`:
  - Checkout uses Stripe hosted checkout.
  - Stripe webhook confirms payment and triggers Shiprocket shipment.

Switching modes requires only `.env` changes (no code changes).

## Run

```bash
npm run api
```

Runs on: `http://localhost:4000`

## Development mode

```bash
npm run api:dev
```

## Endpoints

### Auth

- `POST /register`
  - Creates an admin user with hashed password (`bcryptjs`).
  - Disabled unless `ALLOW_ADMIN_REGISTRATION=true`.
  - Body:
    ```json
    {
      "name": "Admin User",
      "email": "admin@yourstore.com",
      "password": "strong-password-here"
    }
    ```

- `POST /login`
  - Returns JWT token when credentials are valid.
  - Body:
    ```json
    {
      "email": "admin@yourstore.com",
      "password": "strong-password-here"
    }
    ```

- `GET /auth/me`
  - Validates token and returns admin identity.
  - Requires `Authorization: Bearer <token>`.

### Payment + Logistics Automation

- `POST /create-checkout-session`
  - Demo mode: creates and finalizes order immediately with simulated shipment data.
  - Live mode: creates a `PENDING` order, starts Stripe Checkout session, and returns hosted checkout URL.
  - Body:
    ```json
    {
      "customer": {
        "name": "Rahul Nair",
        "email": "rahul@example.com",
        "phone": "9876543210",
        "address": "221B Main Road",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "country": "India"
      },
      "currency": "inr",
      "items": [
        {
          "productId": 1,
          "sku": "PRD-0001",
          "name": "Shower Filter",
          "price": 1999,
          "quantity": 1,
          "weight": 0.5
        }
      ]
    }
    ```

- `POST /webhook/stripe`
  - Live mode only (`DEMO_MODE=false`).
  - Verifies Stripe signature (`STRIPE_WEBHOOK_SECRET`).
  - Handles `checkout.session.completed` event.
  - On success:
    - marks payment as `PAID`
    - updates order status (`CONFIRMED` → `SHIPPED` when shipment is created)
    - deducts inventory stock
    - creates Shiprocket shipment automatically
    - saves tracking info into order record

- `GET /order/:id`
  - Returns order status, payment status, shipment/tracking details.

### Health
- `GET /api/health`

### Products
- `GET /api/products`
  - Optional query params:
    - `search` (matches name, description, longDescription)
    - `category`

- `GET /api/products/:id`

- `POST /api/products`
- `POST /api/products/add`
  - `description` is required when creating a product.
  - Requires `Authorization: Bearer <token>`.
  - Body:
    ```json
    {
      "name": "New Product",
      "price": 1999,
      "category": "Tap Filters",
      "image": "/images/product_tap_filter.jpg",
      "description": "Short product summary for cards.",
      "longDescription": "Detailed technical description for PDP."
    }
    ```

- `PATCH /api/products/:id`
  - Partial update payload supported.
  - Requires `Authorization: Bearer <token>`.

### Inventory
- `GET /api/inventory`
  - Optional query params:
    - `search` (matches sku, name, supplier)
    - `category`
    - `lowStock=true`
  - Requires `Authorization: Bearer <token>`.

- `GET /api/inventory/:sku`
  - Requires `Authorization: Bearer <token>`.

- `POST /api/inventory`
  - Requires `Authorization: Bearer <token>`.
  - Body:
    ```json
    {
      "sku": "WH-500",
      "name": "Whole House Softener WH-500",
      "category": "Water Softeners",
      "unitPrice": 24995,
      "stock": 10,
      "reorderLevel": 5,
      "supplier": "PureFlow Manufacturing"
    }
    ```

- `PATCH /api/inventory/:sku`
  - Partial update payload supported.
  - Requires `Authorization: Bearer <token>`.

- `POST /api/inventory/:sku/adjust`
  - Requires `Authorization: Bearer <token>`.
  - Body:
    ```json
    {
      "quantityChange": -2,
      "reason": "Damaged units"
    }
    ```

- `DELETE /api/inventory/:sku`
  - Requires `Authorization: Bearer <token>`.

### Orders
- `GET /api/orders`
  - Optional query params:
    - `search` (matches id, customer)
    - `status`
  - Requires `Authorization: Bearer <token>`.

- `POST /api/orders`
  - Public checkout endpoint (no admin token required).
  - Supports `items` array (`productId`/`sku` + `quantity`) to decrement stock immediately for manual order flows.
  - Body:
    ```json
    {
      "customer": "Neha Sharma",
      "total": 4590,
      "status": "Pending",
      "itemCount": 2
    }
    ```

- `PATCH /api/orders/:id`
  - Partial update payload supported.
  - Requires `Authorization: Bearer <token>`.

- `DELETE /api/orders/:id`
  - Requires `Authorization: Bearer <token>`.

### Customers
- `GET /api/customers`
  - Optional query params:
    - `search` (matches id, name, email)
  - Requires `Authorization: Bearer <token>`.

- `POST /api/customers`
  - Requires `Authorization: Bearer <token>`.
  - Body:
    ```json
    {
      "name": "Rahul Nair",
      "email": "rahul.nair@example.com",
      "orders": 2,
      "spend": 3490
    }
    ```

- `PATCH /api/customers/:id`
  - Partial update payload supported.
  - Requires `Authorization: Bearer <token>`.

- `DELETE /api/customers/:id`
  - Requires `Authorization: Bearer <token>`.

## Data store

Data is stored in:
- `server/data/products.json`
- `server/data/inventory.json`
- `server/data/orders.json`
- `server/data/customers.json`
- `server/data/admin-users.json`

Order records now also store payment and shipment fields (`paymentStatus`, `orderStatus`, `stripeSessionId`, `shipment`).

This is file-based persistence for prototyping only.
