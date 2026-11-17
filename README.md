# 🐾 PawCare: Animal Adoption & Welfare Management System

A full-stack MERN platform that brings animal adoption, rescue reporting, volunteer coordination, shelter management, medical records and fundraising into one place. Adopters, volunteers, shelter staff, veterinarians and admins each get their own tools, and every rule is enforced on the server.

**Live demo:** https://paw-care-pi.vercel.app
**API health check:** https://paw-care-um9c.onrender.com/

> The API runs on a free hosting plan that sleeps when idle, so the **first load can take about a minute**. Payments run in **Razorpay test mode** (no real money), and all demo data is fake.

---

## Features

### Adoption
- Pet profiles with photos, advanced filters, search and pagination
- Favorites (heart) and side-by-side comparison of up to 3 pets
- Adoption application with housing and pet-care details and document upload
- Status tracking, approval or rejection with a reason, and a visit date
- Approving an application marks the pet adopted and closes the other pending applications

### Rescue and emergency reporting
- Report injured or abandoned animals with photos and a **map-picked location**
- Urgency levels (Low, Medium, High, Critical), assignment to volunteers or staff
- Guarded status flow: Reported → Assigned → In Progress → Resolved, with a history timeline
- Possible duplicate reports are flagged for staff

### Lost and found
- Lost and found reports with photos and map location
- **Automatic matching** by species, colour, breed, gender, size, distance and date, scored out of 100 with the reasons shown
- Duplicate warning before posting, and contact through messages (the poster's identity stays private)

### Volunteers
- Profiles with skills and availability, verified by staff
- Task assignment with a **weekly calendar** and overlap blocking
- Accept or decline tasks, log hours, and request participation certificates that an admin approves and the volunteer can print

### Shelters
- Shelter registration with admin approval
- Capacity tracking, intake, transfers between shelters and discharge (adoptions discharge automatically)
- Supplies with low-stock alerts, expense tracking with receipts, and a printable monthly report
- Staff see only their own shelter's data

### Medical records
- Vaccinations, deworming, treatments and surgery, with documents and follow-up dates
- Daily reminders for upcoming and overdue follow-ups
- Access limited to admins, veterinarians and the shelter that cares for the animal

### Donations and fundraising
- Campaigns with goals and progress bars
- **Razorpay** test payments, confirmed both from the browser and by a signed **webhook**
- Receipts, anonymous donations, and a transparent summary of money received and spent (with bills)

### Admin tools
- Dashboard with live statistics, trend charts and a "needs attention" list
- Moderation of reported listings, and an **audit log** of important admin actions

### Accounts, notifications and extras
- Secure registration, login, forgot-password by email, and role-based access
- In-app notification bell and email alerts
- Printable **QR tags** that link to a pet's profile

---

## User roles

| Role | Main abilities |
|---|---|
| Visitor | Browse pets, shelters, campaigns and lost-and-found reports |
| Adopter | Apply to adopt, report rescues, donate, favorites, lost-and-found |
| Volunteer | Everything an adopter can, plus volunteer profile, tasks, hours and certificates |
| Shelter staff | Manage their shelter's pets, applications, supplies, expenses and campaigns |
| Veterinarian | Medical records for all animals |
| Admin | Everything, plus approvals, moderation, dashboard and audit log |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Tailwind CSS, Axios, Recharts, Leaflet |
| Backend | Node.js, Express |
| Database | MongoDB Atlas with Mongoose |
| Auth and security | JWT, bcrypt, Helmet, express-rate-limit, input sanitising |
| Files | Multer and Cloudinary |
| Payments | Razorpay (test mode) |
| Email | Brevo transactional email API (Nodemailer SMTP for local development) |
| Scheduling | node-cron, plus a secured endpoint for an external scheduler |
| Hosting | Vercel (frontend), Render (API), MongoDB Atlas (database) |

---

## Architecture

```
Browser ──► Vercel (React app)
               │  Axios + JWT
               ▼
            Render (Express API) ──► MongoDB Atlas
               │        │
               │        ├──► Cloudinary   (images and documents)
               │        ├──► Razorpay     (payments, webhooks come back to the API)
               │        └──► Brevo        (emails)
cron-job.org ──┘  (daily reminders, keeps the free server awake)
```

Every request flows through **route → middleware (auth, role, uploads) → controller → Mongoose model**.

---

## Project structure

```
pawcare/
├── client/                 React app
│   └── src/
│       ├── api/            Axios instance with token interceptor
│       ├── components/     Navbar, PetCard, maps, notification bell, ...
│       ├── context/        Auth, favorites and compare state
│       ├── pages/          One file per screen
│       └── utils/
└── server/                 Express API
    ├── config/             Database connection
    ├── controllers/        Business rules
    ├── middleware/         Auth, roles, uploads, input sanitising
    ├── models/             Mongoose schemas
    ├── routes/             API endpoints
    ├── utils/              Email, notifications, matching, audit, reminders
    ├── seed.js             Demo data
    └── server.js
```

---

## Getting started locally

**Prerequisites:** Node.js 22, a MongoDB Atlas cluster, and free accounts for Cloudinary and Razorpay (test mode).

```bash
git clone https://github.com/raji-k001/Paw-Care.git
cd Paw-Care
```

**1. Backend**
```bash
cd server
npm install
cp .env.example .env      # then fill in the values (see below)
npm run dev
```

**2. Frontend** (in a second terminal)
```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

**3. Demo data and an admin account**
```bash
cd server
node seed.js                          # create demo data
node makeAdmin.js you@example.com admin   # promote an account you registered
```

Other seed commands: `node seed.js --reset` (rebuild) and `node seed.js --clean` (remove demo data).

### Environment variables

Real values live in `.env` files, which are never committed. Names only:

**server/.env**

| Variable | Purpose |
|---|---|
| `MONGO_URI` | Atlas connection string, including the database name |
| `JWT_SECRET` | Token signing secret (at least 16 random characters) |
| `CLIENT_URL` | Frontend address, used for CORS and email links (no trailing slash) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image storage |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Test payments |
| `BREVO_API_KEY`, `MAIL_SENDER_EMAIL`, `MAIL_SENDER_NAME` | Email on hosts that block SMTP |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Optional SMTP email for local development |
| `CRON_SECRET` | Protects the reminder endpoint |
| `CERT_MIN_HOURS` | Hours needed before a certificate can be requested (default 10) |

**client/.env**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base address, for example `http://localhost:5000/api` |

---

## API overview

| Area | Base path |
|---|---|
| Auth | `/api/auth` |
| Pets and favorites | `/api/pets`, `/api/favorites` |
| Adoption applications | `/api/applications` |
| Rescues | `/api/rescues` |
| Lost and found | `/api/lostfound` |
| Volunteers, tasks, certificates | `/api/volunteers`, `/api/tasks`, `/api/certificates` |
| Shelters | `/api/shelters` |
| Medical records | `/api/medical` |
| Campaigns and donations | `/api/campaigns`, `/api/donations`, `/api/webhooks/razorpay` |
| Notifications | `/api/notifications` |
| Reports and moderation | `/api/flags` |
| Admin | `/api/dashboard`, `/api/audit` |

---

## Deployment

1. **Database:** MongoDB Atlas, with a separate production database name.
2. **API:** Render web service with root directory `server`, build `npm install`, start `npm start`, and the environment variables above.
3. **Frontend:** Vercel project with root directory `client` and `VITE_API_URL` pointing at the API. A rewrite rule in `client/vercel.json` makes page refreshes work.
4. **Payments:** a Razorpay webhook (test mode) points at `/api/webhooks/razorpay`.
5. **Email:** Brevo's HTTP API, because the free hosting plan blocks SMTP ports.
6. **Reminders:** an external scheduler calls `POST /api/cron/reminders` daily with the `x-cron-secret` header.

---

## Design decisions and trade-offs

- **The server enforces every rule.** The UI only hides buttons. Each route checks the token and the role, and controllers copy only allowed fields from a request, so a user can never send `role: "admin"` or `status: "Approved"` themselves.
- **Access depends on data, not only role.** For example, staff can open only their own shelter's animals, and a rescue case is visible only to staff, the reporter and the assignee.
- **State machines.** Applications, rescue cases, tasks and campaigns move only through allowed statuses, and important changes are recorded in a history or audit log.
- **Payments are confirmed twice, counted once.** The browser confirms a payment, and a signed webhook confirms it again in case the tab was closed. One atomic function marks a donation paid, so it can never be counted twice. The amount is set by the server, never the browser.
- **Side effects never break the main action.** Notifications and emails run in the background and swallow their own errors.
- **Calculations happen in the database.** Dashboard numbers, hours and reports use MongoDB aggregation, so totals can't drift out of sync with the records.
- **Privacy by design.** Public lost-and-found pages never reveal who posted, and anonymous donors are never exposed.
- **Environment-aware hosting choices.** Free hosting sleeps and blocks SMTP, so email uses an HTTP API and scheduled jobs are triggered externally.

---

## Known limitations and future work

- Free hosting means cold starts, and rate-limit counters are kept in memory (a shared store such as Redis would be needed for several servers)
- Payments run in test mode only, and recurring donations and refunds are not implemented
- Transfers between shelters happen immediately, without an accept step
- Lost-and-found matching is rule-based and does not compare photos
- Notifications are polled every 30 seconds (WebSockets would make them instant)
- No automated test suite yet
- Planned: Tamil and English interface, CSV export of reports, and code-splitting to reduce the bundle size

---

## Demo accounts

All demo accounts use the password `Demo@1234`. The data is fake and may be reset at any time.

| Role | Email |
|---|---|
| Admin | `admin@demo.pawcare.test` |
| Shelter staff | `staff@demo.pawcare.test` |
| Veterinarian | `vet@demo.pawcare.test` |
| Volunteer | `volunteer@demo.pawcare.test` |
| Adopter | `adopter@demo.pawcare.test` |

---

## Credits

Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

Built by **Rajeshwari K** ([@raji-k001](https://github.com/raji-k001)) as a full-stack portfolio project.
