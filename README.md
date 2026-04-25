<p align="center">
  <strong>🏠 Home Inventory Management System</strong>
</p>

<p align="center">
  A full-stack, production-grade household inventory tracker with JWT authentication, nested category trees, Firebase image uploads, expiry/low-stock alerts, offline caching, and barcode scanning.
</p>

---

## ✨ Features

| Category | Features |
|---|---|
| **Authentication** | Signup & Login with bcrypt password hashing and JWT session tokens (7-day expiry). Auto-logout on expired tokens via Axios response interceptors. |
| **Inventory CRUD** | Create, read, update, and delete items with full-text search (`?search=`), category filtering, and location scoping. |
| **Nested Categories** | Unlimited-depth category trees built with a self-referential Prisma relation. Collapsible tree UI on both Web and Mobile. |
| **Image Uploads** | Upload item photos via `multer` → Firebase Storage. Displayed as responsive cards on the dashboard. |
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
| **Backend** | Node.js · Express · Prisma ORM · PostgreSQL (Neon DB) · Firebase Admin (Storage) · bcrypt · jsonwebtoken · Zod · multer |
| **Web Frontend** | React · TypeScript · React Router · Axios · Vanilla CSS (utility classes) |
| **Mobile App** | React Native · Expo · TypeScript · Axios · AsyncStorage · expo-camera |

---

## 📂 Project Structure

```
my-home/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema (User, Location, Category, Item)
│   └── src/
│       ├── controllers/            # auth, item, category controllers
│       ├── middleware/              # auth.middleware, validate.middleware
│       ├── routes/                  # auth, item, category routes
│       ├── validators/              # Zod schemas
│       ├── utils/                   # Firebase upload helpers
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
| `POST` | `/api/auth/signup` | `{ email, password, name? }` | Register a new user. Returns JWT + user object. |
| `POST` | `/api/auth/login` | `{ email, password }` | Authenticate an existing user. Returns JWT + user object. |

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
- A **Firebase** project with Storage enabled (for image uploads)

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

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-here"

# Firebase Admin SDK — paste your service account values
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-client-email@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
```

Run the database migration:

```bash
npx prisma db push
npx prisma generate
```

Start the dev server:

```bash
npm run dev
# → Server running on http://localhost:3000
```

### 3. Web Frontend Setup

```bash
cd ../web-frontend
npm install
npm run dev
# → Opens on http://localhost:5173
```

### 4. Mobile App Setup

```bash
cd ../mobile-app
npm install
npx expo install expo-camera @react-native-async-storage/async-storage
npx expo start
```

> **Note:** For physical devices, update `API_BASE_URL` in `mobile-app/api.ts` to your machine's LAN IP (e.g., `http://192.168.1.100:3000`).

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for signing JWTs |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project identifier |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | ✅ | Firebase service account private key |
| `FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Storage bucket name |

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
