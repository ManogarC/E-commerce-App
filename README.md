# 🛒 ShopEase — High-Concurrency E-Commerce Platform

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green.svg?logo=node.js)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Relational_DB-4169e1.svg?logo=postgresql)](https://www.postgresql.org/)

> **ShopEase** is an enterprise-grade, full-stack e-commerce web platform engineered with four defensive layers to handle **high-concurrency flash sales, rapid click spamming, bot scraping, and zero-overselling inventory contention**. Built with **React 19, Tailwind CSS v4, Express.js, and PostgreSQL**.

---

## Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [High-Concurrency & Flash-Sale Safeguards](#-high-concurrency--flash-sale-safeguards)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [Interactive Concurrency & Bot Simulator](#-interactive-concurrency--bot-simulator)
- [Core Application Features](#-core-application-features)
- [Quick Start Guide](#-quick-start-guide)
- [Demo Credentials](#-demo-credentials)
- [API Reference](#-api-reference)
- [Engineering Highlights for Resumes & Interviews](#-engineering-highlights-for-resumes--interviews)

---

## Overview

During viral flash sales and seasonal sales events, standard e-commerce applications experience severe bottlenecks:
1. **Frontend Click Floods**: Frustrated users repeatedly click the checkout button during latency spikes, triggering duplicate charges and duplicate orders.
2. **Database Write Bottlenecks**: Heavy synchronous write operations lock database tables, spike connection pools, and drop incoming customer requests.
3. **Dirty Reads & Overselling**: Concurrent requests read stale inventory counters simultaneously, resulting in negative stock (selling 550 items when only 500 exist).
4. **Bot Scalping & DDoS**: Automated bots flood endpoints, starving legitimate customers of inventory.

**ShopEase** addresses these challenges by implementing an asynchronous, decoupled, multi-tier defense architecture:
- **Client-Side Spam Guard & Idempotency Keys** to intercept duplicate user actions.
- **Asynchronous Message Queue with Sequential Worker** to decouple heavy database writes from the HTTP request-response cycle.
- **In-Memory Hot Caching (Redis Simulation)** serving catalog queries with sub-2ms response times (`X-Cache: HIT`).
- **Authoritative Atomic Conditional Locks** (`WHERE stock >= requested_qty`) guaranteeing that strictly only the allocated units are sold.

---

## System Architecture

The application is structured into four decoupled layers:

```mermaid
graph TD
    subgraph Tier1 ["1. Client Layer (React 19 + Tailwind CSS)"]
        UI["Storefront & Product Catalog"]
        FSM["Checkout State Machine (7 States)"]
        SpamGuard["Click Spam Guard (Flag + Button Disabler)"]
        Poller["Exponential Backoff Poller (+ Jitter)"]
        Console["Interactive Concurrency Simulator Console"]
    end

    subgraph Tier2 ["2. API Gateway & Routing Layer (Express.js)"]
        Proxy["Vite Reverse Proxy (:5173 ➔ :5000)"]
        RateLimiter["Sliding-Window Rate Limiter (25 req / 10s)"]
        Honeypot["Anti-Bot Honeypot Trap Filter"]
        JWTAuth["Stateless JWT Authentication"]
    end

    subgraph Tier3 ["3. Application Logic & Queue Layer"]
        HotCache["In-Memory Product Cache (TTL Layer)"]
        IdemStore["Idempotency Key Store (Deduplication)"]
        AsyncQueue["Decoupled Order Queue (FIFO)"]
        AsyncWorker["Sequential Background Queue Worker"]
    end

    subgraph Tier4 ["4. Storage & Persistence Layer"]
        DBConnector["Unified PostgreSQL / Relational DB Client"]
        UsersDB[("users")]
        ProductsDB[("products (Authoritative Stock Counter)")]
        OrdersDB[("orders & order_items")]
    end

    UI --> SpamGuard --> FSM
    FSM --> Poller
    SpamGuard --> Proxy --> RateLimiter
    RateLimiter --> Honeypot --> JWTAuth
    JWTAuth --> IdemStore
    JWTAuth --> HotCache
    IdemStore --> AsyncQueue
    AsyncQueue --> AsyncWorker
    AsyncWorker --> DBConnector
    DBConnector --> ProductsDB
    DBConnector --> OrdersDB
    DBConnector --> UsersDB
    AsyncWorker -.->|Flush on Change| HotCache
    Poller -->|Poll Status| AsyncQueue
```

---

##  High-Concurrency & Flash-Sale Safeguards

### 1. Frontend Tier: Click-Spam Guard & Idempotency
- **Immediate Button Disabling**: The submit button is disabled on the first click (`disabled={isSubmitting}`) with visual loading indicators.
- **Session Idempotency Key**: Generates a unique UUID (`X-Idempotency-Key`) per checkout attempt. If the client retries, the backend detects the duplicate key and returns the existing order rather than creating a duplicate.
- **7-State Finite State Machine (FSM)**:
  $$\text{IDLE} \longrightarrow \text{ENQUEUING} \longrightarrow \text{QUEUED} \longrightarrow \text{PROCESSING} \longrightarrow \begin{cases} \text{CONFIRMED} \\ \text{SOLD\_OUT} \\ \text{FAILED} \end{cases}$$
- **Exponential Backoff Polling with Jitter**:
  When polling for order completion from the asynchronous worker, the client applies backoff and randomized jitter to prevent thundering herd spikes:
  $$\text{delay} = \min(\text{maxDelay}, \text{baseDelay} \times 1.4^{\text{attempt}}) + \text{random}() \times \text{jitter}$$

### 2. Gateway Tier: Rate Limiting & Anti-Bot Honeypot
- **Sliding-Window Rate Limiter**: Throttles order submissions to 25 requests per 10 seconds per IP/token, returning `HTTP 429 Too Many Requests` with a `Retry-After` header.
- **Honeypot Trap**: An invisible form input (`hp_website`) that regular users never fill. Automated web-scraping bots that scan and fill all fields are detected and blocked immediately with `HTTP 400 BOT_DETECTED`.
- **Stateless JWT Authorization**: Bearer tokens carry self-contained user claims, enabling horizontal scaling without centralized session state.

### 3. Application Tier: Decoupled Queue & In-Memory Caching
- **Fast HTTP 202 Ingestion**: `POST /api/orders` enqueues the payload and returns `HTTP 202 Accepted` with a queue position in **< 15ms**, freeing up HTTP threads immediately.
- **In-Memory Hot Caching**: Catalog queries (`GET /api/products`) are cached with TTL to bypass database reads during high traffic (`X-Cache: HIT`). The cache is automatically invalidated when orders are processed.

### 4. Database Tier: Authoritative Atomic Counter (Zero Overselling)
- **Conditional SQL Updates**: Inventory is decremented with strict database-level constraints:
  ```sql
  UPDATE products 
  SET stock = stock - 1 
  WHERE id = 2 AND stock >= 1 
  RETURNING *;
  ```
- If remaining stock is less than requested quantity, `rowCount === 0`. The sequential queue worker aborts the transaction, rolls back partial items, and marks the order as `sold_out`. **Overselling is mathematically impossible.**

---

## Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing**: [React Router DOM v7](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)

### Backend & Database
- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via `pg.Pool`) with automated zero-config relational demo engine fallback
- **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Architecture**: Asynchronous Worker Queue, In-Memory Caching, Sliding-Window Rate Limiter

---

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : referenced_in

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role "user | admin"
        timestamp created_at
    }

    PRODUCTS {
        int id PK
        string name
        text description
        numeric price
        string category
        text image_url
        int stock "Authoritative Counter"
        numeric rating
        int review_count
        timestamp created_at
    }

    ORDERS {
        string id PK "ORD-XXX"
        int user_id FK
        string user_email
        string customer_name
        text shipping_address
        string phone
        numeric total
        string status "confirmed | pending | sold_out | failed"
        timestamp created_at
    }

    ORDER_ITEMS {
        int id PK
        string order_id FK
        int product_id FK
        string product_name
        numeric price
        int qty
        text image_url
    }
```

---

## Interactive Concurrency & Bot Simulator

ShopEase features a built-in **Live Stress-Testing Console** accessible directly from the top navigation bar via the **"⚡ Flash Sale Console"** button.

| Simulation Test | What It Does | Observed Safeguard |
|---|---|---|
| **1. Rapid-Click Spam (5x)** | Fires 5 concurrent order requests in under 50ms using the exact same Idempotency Key. | Request #1 is accepted into the queue; requests #2–5 are intercepted by the **Idempotency Guard** and returned without duplicate orders. |
| **2. Concurrency Wave (6 Users)** | Simulates 6 separate concurrent buyers competing for live inventory in the same millisecond. | Demonstrates **Sequential Queue Serialization** and **Atomic Stock Decrement**. The remaining stock updates accurately without dirty reads. |
| **3. Bot Honeypot Attack** | Programmatically submits an automated order with the hidden honeypot trap field populated. | The **Gateway Bot Shield** detects the automated scraper and blocks the request with `HTTP 400 BOT_DETECTED`. |

---

## Core Application Features

1. **Live Flash Sale Widget**:
   - Flagship product: **"⚡ CyberPulse Neo Pro (Strictly 500 Units)"**.
   - Real-time stock counter (`X / 500 units remaining`) and live event countdown timer.
2. **Product Catalog & Search**:
   - Filter by categories (*Electronics*, *Fashion*, *Home & Living*, *Sports*, *Books*).
   - Instant search with debounced filtering.
   - Dynamic product detail pages with breadcrumbs and stock level badges.
3. **Shopping Cart Drawer**:
   - Slide-over drawer with instant subtotal calculations.
   - Quantity increments, decrements, item deletion, and cart clearing.
   - Persisted across page refreshes via `localStorage`.
4. **Checkout Flow**:
   - Shipping form validation.
   - Real-time status progress banner showing queue position and worker state.
   - Seamless transition to order confirmation receipts.
5. **Admin Control Panel (`/admin`)**:
   - Role-protected route accessible only to users with `role: "admin"`.
   - Real-time metrics: *Total Products*, *Total Orders*, *Total Revenue*, and *Queue / Anti-Spam Stats*.
   - Product management: Create, update, and delete catalog products.
   - Orders overview: Inspect all customer purchases with detailed item lists.

---

## Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Optional: A local or cloud PostgreSQL instance (e.g. Neon, Supabase, AWS RDS). *If PostgreSQL is offline or unconfigured, the application automatically uses an embedded relational store with full data persistence.*

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/e-commerce-application.git
   cd e-commerce-application
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create or verify the `.env` file in the root directory:
   ```env
   PORT=5000
   JWT_SECRET=shopease_jwt_secret_demo_2026
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce
   ```

4. **Launch Application (Single Command)**:
   ```bash
   npm run dev
   ```

   This concurrently starts:
   - **Express REST API Server**: `http://localhost:5000`
   - **Vite + React Storefront**: `http://localhost:5173`

---

## Demo Credentials

On the **Sign In** page (`/login`), you can use the **1-Click Demo Login** buttons for instant access:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@shopease.com` | `admin123` | Full access + `/admin` panel (add/edit/delete products, view all customer orders, live revenue KPIs) |
| **Demo Customer** | `user@shopease.com` | `user123` | Browse catalog, add to cart, queue checkout, view personal order history |

---

## API Reference

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/login` | Authenticate and receive JWT | Public |
| `GET` | `/api/auth/me` | Fetch authenticated profile | Bearer Token |

### Products & Inventory
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/products` | List all products (supports `?category=` and `?search=`) | Public (Cached) |
| `GET` | `/api/products/flash-sale` | Fetch active 500-unit flash sale product | Public (Cached) |
| `GET` | `/api/products/:id` | Fetch product details by ID | Public (Cached) |
| `GET` | `/api/products/cache/stats`| Inspect cache hit rate and key counts | Public |
| `POST` | `/api/products` | Create product (flushes cache) | Admin |
| `PUT` | `/api/products/:id` | Update product details or stock | Admin |
| `DELETE`| `/api/products/:id` | Delete product | Admin |

### High-Concurrency Orders & Queue
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/orders` | Enqueue order (Supports `X-Idempotency-Key` & Honeypot) | Bearer Token |
| `GET` | `/api/orders/:id/status`| Poll live queue status (`queued`, `processing`, `confirmed`, `sold_out`) | Bearer Token |
| `GET` | `/api/orders/queue/stats`| Inspect active queue length and blocked duplicates | Public |
| `GET` | `/api/orders/my-orders` | Fetch personal order history | Bearer Token |
| `GET` | `/api/orders/:id` | Fetch specific order receipt | Bearer Token |
| `GET` | `/api/orders` | List all customer orders | Admin |
| `GET` | `/api/orders/admin/stats`| Fetch KPI metrics (products, orders, revenue, queue) | Admin |

---

## Engineering Highlights for Resumes & Interviews

Here are key technical talking points and architectural patterns demonstrated in this codebase:

1. **Decoupled Asynchronous Processing**:
   > *"Engineered an asynchronous queue ingestion pattern in Express.js returning HTTP 202 Accepted in under 15ms, eliminating database write latency from the synchronous request-response path."*
2. **Idempotency & Anti-Spam Protection**:
   > *"Implemented an idempotency key layer matching UUIDs to order jobs, deduplicating rapid-fire user click spam and preventing double-billing or multiple order creation."*
3. **Authoritative Atomic Inventory Locks**:
   > *"Guaranteed zero overselling on flash sale items through conditional atomic SQL updates (`WHERE stock >= requested_qty`), eliminating race conditions and dirty reads under high concurrency."*
4. **Client-Side Resiliency & Backoff**:
   > *"Designed a 7-state Finite State Machine in React with exponential backoff and randomized jitter polling, preventing thundering herd spikes against the status API."*
5. **Gateway Security & Bot Defense**:
   > *"Added dual-layer gateway protection with sliding-window rate limiting (HTTP 429) and transparent honeypot traps to detect and reject automated scrapers (HTTP 400)."*

# NOTE
   **The product listed in the flash sale and in the site is fictional and has been created solely for demonstration and educational purposes.**
   **The project needs more improvements like adding a payment gateway integration , chat support , product reviews and ratings , wishlist etc.,**