<p align="center">
  <strong>🏠 Home Inventory Management System</strong>
</p>

<p align="center">
  A full-stack, production-grade household inventory tracker with JWT authentication, role-based access control, nested category trees, configurable image uploads (Firebase / Cloudinary), expiry/low-stock alerts, offline caching, and barcode scanning.
</p>

---

## ✨ Features

| Category | Features |
|---|---|
| **Authentication** | Signup & Login with bcrypt password hashing and JWT session tokens (7-day expiry). Auto-logout on expired tokens via Axios response interceptors. |
| **Role-Based Access** | Two roles: `ADMIN` and `USER`. All signups default to `USER`. Admins are promoted via a CLI script. A `requireRole()` middleware gates admin-only routes. |
| **Inventory CRUD** | Create, read, update, and delete items with full-text search (`?search=`), category filtering, and location scoping. |
| **Nested Categories** | Unlimited-depth category trees built with a self-referential Prisma relation. Collapsible tree UI on both Web and Mobile. Default household categories seeded via script. |
| **Image Uploads** | Upload item photos via `multer` → Firebase Storage or Cloudinary (configurable via `IMAGE_STORAGE_SERVICE` env var). |
| **Expiry & Low-Stock Alerts** | Dedicated `/api/items/alerts` endpoint surfaces items with `quantity ≤ 1` or `expiryDate` within 30 days. Rendered as a "Needs Attention" dashboard widget. |
| **Offline Caching (Mobile)** | The React Native app caches the last successful API response to `AsyncStorage` and serves it when the backend is unreachable. |
| **Barcode Scanning (Mobile)** | The "Add Item" screen includes an `expo-camera` powered barcode scanner that populates the item name field from a scanned UPC/QR code. |
| **Input Validation** | Server-side validation with [Zod](https://zod.dev/) — rejects negative quantities, empty names, and malformed emails before they hit the database. |
| **Toast Notifications (Web)** | A zero-dependency toast system for success, error, and info messages with smooth CSS animations. |
| **React Context State** | Both Web and Mobile use `InventoryContext` + `AuthContext` to eliminate prop drilling entirely. |

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js · Express · Prisma 7 ORM · PostgreSQL (Neon DB) · Firebase Admin / Cloudinary (Storage) · bcrypt · jsonwebtoken · Zod · multer |
| **Web Frontend** | React · TypeScript · React Router · Axios · Tailwind CSS |
| **Mobile App** | React Native · Expo · TypeScript · Axios · AsyncStorage · expo-camera |

---

## 📂 Project Structure

```
my-home/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (User, Location, Category, Item, Role)
│   │   └── seed.ts                # Default category population script
│   ├── scripts/
│   │   └── create-admin.ts        # CLI script to promote a user to ADMIN
│   ├── prisma.config.ts           # Prisma 7 datasource configuration
│   └── src/
│       ├── controllers/            # auth, item, category controllers
│       ├── middleware/              # auth, validate, role middleware
│       ├── routes/                  # auth, item, category routes
│       ├── validators/              # Zod schemas
│       ├── utils/storage/           # Firebase & Cloudinary upload adapters
│       ├── lib/                     # Prisma client singleton
│       ├── app.ts                   # Express app setup
│       └── server.ts                # Entry point
├── web-frontend/
│   └── src/
│       ├── components/              # AuthScreen, CategoryTree, InventoryList, ItemForm
│       ├── context/                 # AuthContext, InventoryContext
│       ├── api.ts                   # Axios instance, interceptors, all API functions
│       └── App.tsx                  # Root component with routing
├── mobile-app/
│   ├── screens/                     # AuthScreen, HomeScreen, AddItemScreen
│   ├── context/                     # AuthContext, InventoryContext
│   ├── api.ts                       # Axios instance, interceptors, all API functions
│   └── App.tsx                      # Root component with navigation
└── README.md
```

---

## 📡 API Reference

All endpoints under `/api/items` and `/api/categories` require a valid JWT in the `Authorization: Bearer <token>` header.

### Auth (Public)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | `{ email, password, name? }` | Register a new user (role defaults to `USER`). Returns JWT + user object with role. |
| `POST` | `/api/auth/login` | `{ email, password }` | Authenticate an existing user. Returns JWT + user object with role. |

### Items (Protected)

| Method | Endpoint | Params / Body | Description |
|---|---|---|---|
| `GET` | `/api/items` | `?userId=&categoryId=&locationId=&search=` | List items with optional filters. |
| `GET` | `/api/items/alerts` | `?userId=` | Items with `quantity ≤ 1` OR expiry within 30 days. |
| `GET` | `/api/items/:id` | — | Get a single item by ID. |
| `POST` | `/api/items` | `FormData: name, quantity, unit, userId, categoryId, locationId, expiryDate?, image?` | Create an item (multipart). |
| `PUT` | `/api/items/:id` | `FormData: (partial fields)` | Update an item. |
| `DELETE` | `/api/items/:id` | — | Delete an item. |

### Categories (Protected)

| Method | Endpoint | Params / Body | Description |
|---|---|---|---|
| `GET` | `/api/categories/tree` | `?userId=` | Get the full nested category tree for a user. |
| `POST` | `/api/categories` | `{ name, userId, parentCategoryId? }` | Create a category (optionally nested). |

### Utility

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check — returns `{ status: "ok" }` |

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** ≥ 20
- **npm** or **yarn**
- A **PostgreSQL** database (e.g., [Neon](https://neon.tech/))
- A **Firebase** project with Storage enabled OR a **Cloudinary** account (for image uploads)

### 1. Clone the Repository

```bash
git clone <repo-url>
cd my-home
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file (refer to `.env.sample` for all variables):

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-here"

# Image storage: "firebase" or "cloudinary"
IMAGE_STORAGE_SERVICE="cloudinary"
IMAGE_STORAGE_FOLDER="inventory_images"

# Cloudinary (if using cloudinary)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Firebase (if using firebase)
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
FIREBASE_SERVICE_ACCOUNT_KEY='{"projectId":"...","clientEmail":"...","privateKey":"..."}'
```

### 3. Database Setup

Push the schema to your database and generate the Prisma client:

```bash
npx prisma db push
npx prisma generate
```

### 4. Create Your First User & Seed Data

Start the backend, sign up via the API or frontend, then run:

```bash
# Start the backend
npm run dev

# (in another terminal) Promote a user to admin
npx tsx scripts/create-admin.ts your-email@example.com

# Seed default categories for that user
npx tsx prisma/seed.ts your-email@example.com
```

### 5. Web Frontend Setup

```bash
cd ../web-frontend
npm install
npm run dev
# → Opens on http://localhost:5173
```

### 6. Mobile App Setup

```bash
cd ../mobile-app
npm install
npx expo install expo-camera @react-native-async-storage/async-storage
npx expo start
```

> **Note:** For physical devices, update `API_BASE_URL` in `mobile-app/api.ts` to your machine's LAN IP (e.g., `http://192.168.1.100:3000`).

---

## 🗃️ Database Scripts

| Script | Command | Description |
|---|---|---|
| **Seed Categories** | `npx tsx prisma/seed.ts <user-email>` | Populates default household categories (Kitchen, Bedroom, Bathroom, etc.) with subcategories for the given user. Idempotent — skips existing entries. |
| **Promote to Admin** | `npx tsx scripts/create-admin.ts <user-email>` | Promotes an existing user to the `ADMIN` role. |
| **Push Schema** | `npx prisma db push` | Applies Prisma schema changes to the database. |
| **Generate Client** | `npx prisma generate` | Regenerates the Prisma client after schema changes. |
| **Open Studio** | `npx prisma studio` | Opens the Prisma Studio GUI to browse your data. |

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for signing JWTs |
| `IMAGE_STORAGE_SERVICE` | ✅ | `"firebase"` or `"cloudinary"` |
| `IMAGE_STORAGE_FOLDER` | ❌ | Folder name for uploads (defaults to `"items"`) |
| `CLOUDINARY_CLOUD_NAME` | ⚡ | Required if using Cloudinary |
| `CLOUDINARY_API_KEY` | ⚡ | Required if using Cloudinary |
| `CLOUDINARY_API_SECRET` | ⚡ | Required if using Cloudinary |
| `FIREBASE_STORAGE_BUCKET` | ⚡ | Required if using Firebase |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ⚡ | Required if using Firebase |

---

## 👤 User Roles

| Role | Description | How to Assign |
|---|---|---|
| `USER` | Default role. Can manage their own inventory, categories, and items. | Automatic on signup |
| `ADMIN` | Full access. Can manage all resources. | Run `npx tsx scripts/create-admin.ts <email>` |

---

## 📋 Validation Rules (Zod)

| Field | Rule |
|---|---|
| `email` | Must be a valid email format |
| `password` | Min 6 characters, max 128 |
| `item.name` | Non-empty string |
| `item.quantity` | Number ≥ 0 (no negatives) |
| `item.unit` | Non-empty string |
| `category.name` | Non-empty, max 100 characters |

---

## 📄 License

This project is private and not currently licensed for distribution.
