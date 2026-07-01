# News Platform Backend

Single Express API server powering the admin panel + 8+ dynamic news landing pages.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL + Drizzle ORM
- **Storage**: MinIO (S3-compatible)
- **Cache**: Redis
- **Auth**: JWT + httpOnly cookies
- **Container**: Docker + docker-compose

## Quick Start

### 1. Start Docker services

```bash
docker-compose up -d postgres pgadmin redis minio
```

This starts:
- **PostgreSQL** → localhost:5432
- **pgAdmin** → localhost:5050 (admin@news.com / admin123)
- **Redis** → localhost:6379
- **MinIO** → localhost:9000 (console: localhost:9001)

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 4. Run database migrations

```bash
npm run db:push
```

### 5. Seed the database

```bash
npm run db:seed
```

Default admin: `admin@news.com` / `admin123`

### 6. Start dev server

```bash
npm run dev
```

API available at `http://localhost:5000`

## Full Docker Deploy

```bash
docker-compose up -d
```

This starts all services including the API server.

## API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register customer |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user + subscription |
| POST | `/api/auth/logout` | Logout |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |
| DELETE | `/api/auth/account` | Delete account (DPDP) |

### Sites
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sites` | List all sites |
| GET | `/api/sites/resolve` | Resolve domain → site |
| POST | `/api/sites` | Create site (admin) |
| PUT | `/api/sites/:id` | Update site (admin) |

### Articles
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/articles` | Public list (filters, pagination) |
| GET | `/api/articles/:slug` | Article detail |
| GET | `/api/articles/admin/list` | Admin list (editor+) |
| POST | `/api/articles` | Create (editor+) |
| PUT | `/api/articles/:id` | Update (editor+) |
| DELETE | `/api/articles/:id` | Delete (editor+) |
| PATCH | `/api/articles/:id/toggle-breaking` | Toggle breaking |
| PATCH | `/api/articles/:id/toggle-trending` | Toggle trending |

### Categories, Tags, Media
Standard CRUD at `/api/categories`, `/api/features/tags`, `/api/media`

### Ads & Advertisers
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/ads/zone/:zone` | Get ad for zone |
| POST | `/api/ads/impression` | Record impression |
| POST | `/api/ads/click` | Record click |
| POST | `/api/ads/advertiser/register` | Advertiser signup |
| POST | `/api/ads/advertiser/login` | Advertiser login |
| POST | `/api/ads/advertiser/request` | Submit ad request |
| GET | `/api/ads/admin/list` | Admin: list ads |
| GET | `/api/ads/analytics` | Admin: ad analytics |

### Reporters (Patrakar)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/reporters/register` | Reporter signup |
| POST | `/api/reporters/login` | Reporter login |
| POST | `/api/reporters/submissions` | Submit article |
| GET | `/api/reporters/admin/list` | Admin: list reporters |
| PATCH | `/api/reporters/admin/:id/approve` | Approve reporter |

### Membership
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/membership/plans` | List plans |
| POST | `/api/membership/subscribe` | Subscribe |
| GET | `/api/membership/my-subscription` | My subscription |
| POST | `/api/membership/cancel` | Cancel |
| GET | `/api/membership/payment-history` | Payment history |

### Features
Rashifal, Web Stories, Photo Galleries, Live Blogs, Topics, Authors, States/Cities, Reactions, Bookmarks, Comments, Search, Utility Data — all at `/api/features/*`

### Admin
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/users` | List users |
| PATCH | `/api/admin/users/:id/role` | Change user role |
| GET | `/api/admin/comments/pending` | Pending comments |
| GET | `/api/admin/audit-logs` | Audit logs |
| GET | `/api/admin/layouts` | Get page layout |
| PUT | `/api/admin/layouts` | Update page layout |

## Multi-Site Architecture

Each request resolves a site via:
1. `X-Site-Id` header (slug)
2. Hostname matching (`domain` or `subdomain` column)

Articles, categories, ads are filtered by `siteId`. Articles with `isGlobal: true` appear on all sites.
