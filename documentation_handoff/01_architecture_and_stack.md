# UniFlow — Verified Architecture & Technology Stack (v2)

> **Document Status:** VERIFIED AGAINST SOURCE CODE  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Working Tree State:** `backend/.env` modified (line addition for `DB_PASSWORD`), all other source files identical to HEAD.  
> **Auditor Role:** Senior Software Architect & Code Auditor  
> **Date of Audit:** October 23, 2026  

---

## 1. Technology Stack Inventory

### 1.1 Client-Side (Frontend)

UniFlow's user interface is structured as a multi-page web application using standard vanilla web technologies:
- **Markup:** Semantic HTML5 (`UI/index.html`, `UI/hod/dashboard.html`, `UI/faculty/dashboard.html`, `UI/student/dashboard.html`, `UI/admin/dashboard.html`).
- **Styling:** Vanilla CSS3 with CSS Custom Properties (design tokens defined in `UI/css/theme.css`, `UI/css/login.css`, `UI/hod/css/hod.css`, `UI/student/css/student.css`, `UI/admin/css/admin.css`). Glassmorphism aesthetic with frosted backdrops (`backdrop-filter: blur(12px)`).
- **Typography & Icons:**
  - Google Fonts: `'Inter'` (Sans-serif font family: `400`, `500`, `600`, `700`, `800`).
  - Google Material Symbols: `material-symbols-outlined` (imported via Google CDN).
- **Visualization:** `Chart.js` (loaded via CDN `https://cdn.jsdelivr.net/npm/chart.js` in `UI/hod/dashboard.html:9` and `UI/faculty/dashboard.html:10`). Used to render animated bar charts for faculty workload analytics.
- **Client Networking:** Native `window.fetch()` API communicating via JSON over HTTP.
- **Client State Storage:** Browser `localStorage` (used for `uniflow_token`, `uniflow_currentUser`, and mocked state for timetable, admin tables, chat, and grievances).

#### Design Token System (`UI/css/theme.css:1-40`)
```css
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --primary-light: #e0e7ff;
  --secondary-color: #06b6d4;
  --accent-color: #8b5cf6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --info-color: #3b82f6;
  --bg-dark: #0f172a;
  --surface-dark: #1e293b;
  --card-dark: rgba(30, 41, 59, 0.7);
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-light: #64748b;
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

---

### 1.2 Server-Side (Backend)

The server runs on Node.js utilizing Express 5:
- **Runtime:** Node.js (tested and executed on Node v25.0.0).
- **Framework:** Express.js `^5.2.1` (`backend/package.json:19`).
- **Architecture Pattern:** Controller-Service-Repository style using Express routers, controller functions, and direct PostgreSQL parameterized SQL queries.

#### Dependency Audit (`backend/package.json` vs Active Code Usage)
| Package | Declared Version | Purpose in Code | Active Evidence in Code |
| :--- | :--- | :--- | :--- |
| `express` | `^5.2.1` | HTTP routing, middleware pipeline, static serving | `backend/src/server.js:1` (`require('express')`) |
| `cors` | `^2.8.6` | Cross-Origin Resource Sharing enabling browser requests | `backend/src/server.js:2` (`app.use(cors())`) |
| `dotenv` | `^17.4.2` | Loading environment variables from `.env` | `backend/src/server.js:4`, `backend/src/config/db.js:2` |
| `pg` | `^8.23.0` | PostgreSQL client connection pooling | `backend/src/config/db.js:1` (`const { Pool } = require('pg')`) |
| `jsonwebtoken` | `^9.0.3` | JWT creation and cryptographic verification | `backend/src/controllers/authController.js:2`, `backend/src/middleware/authMiddleware.js:1` |
| `bcryptjs` | `^3.0.3` | Password hashing (salt rounds = 10) & verification | `backend/src/controllers/authController.js:1`, `backend/seed.js:1` |
| `nodemon` | `^3.1.14` | Development auto-reload (devDependency) | `backend/package.json:8` (`npm run dev`) |

*Finding:* 100% of declared packages are actively utilized. There are zero dead dependencies in `backend/package.json`.

---

### 1.3 Database Subsystem

- **Database Engine:** PostgreSQL 16+ running locally on port `5432`.
- **Driver:** `pg` (node-postgres) Connection Pool (`backend/src/config/db.js:4-10`).
- **Connection Configuration:**
  ```javascript
  const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
  });
  ```
- **Error Handling:** Connection error listener registered on `pool.on('error', ...)` to prevent unhandled node crash.
- **Query Parameterization:** All dynamic inputs are passed as parameterized `$1, $2, ...` placeholders to prevent SQL injection.

---

## 2. Server Startup & Middleware Pipeline

The HTTP server lifecycle is initiated from `backend/src/server.js`:

```
Incoming HTTP Request
         │
         ▼
[ cors() ] (Allow all origins)
         │
         ▼
[ express.json() ] (Strict 100 KB body limit)
         │
         ▼
[ express.static('../../UI') ] (Serves HTML, CSS, JS directly)
         │
         ▼
[ Route Dispatcher ]
   ├── /api/auth     ──► authRoutes.js     (Public: login)
   ├── /api/workload ──► workloadRoutes.js (HOD & Academic Workload)
   ├── /api/faculty  ──► facultyRoutes.js  (Faculty tasks & student assignments)
   └── /api/student  ──► studentRoutes.js  (Student portal & submissions)
```

### 2.1 Startup Automatic Migrations & Linus Cleanup (`server.js:41-64`)
When `node src/server.js` boots:
1. Executes `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS faculty_remark TEXT, attachment_filename VARCHAR(255), attachment_url TEXT, completed_at TIMESTAMP;` (adds legacy columns).
2. Clears tasks for Linus Torvalds: `DELETE FROM tasks WHERE assigned_to IN (SELECT id FROM users WHERE email = 'linus@uniflow.edu' OR name ILIKE '%Linus%');`.
3. Calls `initWorkloadTables()` from `backend/src/config/initWorkloadTables.js`, which ensures tables 11 through 18 exist, drops foreign key constraints on multi-domain tables to support flexible role IDs, and seeds standard master catalog data across all 6 categories.

---

## 3. How to Install, Configure, and Run

### 3.1 Prerequisites
1. **Node.js** (v18.0.0 or higher; v25.0.0 tested)
2. **PostgreSQL** (v14+; port 5432)

### 3.2 Database Initialization
Create database in PostgreSQL:
```sql
CREATE DATABASE uniflow;
```

### 3.3 Configuration (`backend/.env`)
Create `backend/.env` containing the following variable definitions (do NOT commit secrets to public repositories):
```ini
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uniflow
DB_USER=postgres
DB_PASSWORD=<your_postgres_password>
JWT_SECRET=<your_secure_random_jwt_secret>
```

### 3.4 Installation & Seeding Commands
Execute from the terminal:
```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Seed database tables, initial users, courses, subjects, and student data
npm run seed

# 3. (Optional) Populate multi-teacher simulation for Chart.js analytics
node simulate_workload.js

# 4. Start the production backend server
npm start
# OR start with auto-reload for development
npm run dev
```

### 3.5 Serving the Frontend
The frontend can be accessed in two verified ways:
1. **Via Express Server (Recommended):** Open `http://localhost:5000/` or `http://localhost:5000/index.html`. Express serves the entire `UI/` folder via `app.use(express.static(path.join(__dirname, '../../UI')))`.
2. **Via Live Server / File Server:** Open `UI/index.html` via VS Code Live Server (`http://127.0.0.1:5500/UI/index.html`). The frontend scripts (`login.js`, `faculty.js`, `hod.js`, `student.js`) explicitly point to `http://localhost:5000` via `const API_URL = 'http://localhost:5000'`.

---

## 4. Test Accounts Seeded in Database

The seeding script `backend/seed.js` initializes the following verified accounts (passwords are stored as salted bcrypt hashes; secret passwords omitted per audit protocol):

| Role | Name | Email | Custom ID | Department / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | UniFlow Administrator | `admin@uniflow.edu` | `ADM001` | System-wide |
| **HOD (CS)** | Dr. Alan Turing | `hod.cs@uniflow.edu` | `HOD-CS01` | Computer Science (Dept ID: 1) |
| **HOD (Mech)** | Dr. Nikola Tesla | `hod.me@uniflow.edu` | `HOD-ME02` | Mechanical Engineering (Dept ID: 2) |
| **HOD (EEE)** | Dr. Marie Curie | `hod.ee@uniflow.edu` | `HOD-EE03` | Electrical Engineering (Dept ID: 3) |
| **Faculty Member** | Grace Hopper | `faculty@uniflow.edu` | `FAC001` | Computer Science (Dept ID: 1) |
| **Faculty Member** | Linus Torvalds | `linus@uniflow.edu` | `FAC002` | Computer Science (Dept ID: 1) |
| **Student** | Ada Lovelace | `student@uniflow.edu` | `STU001` | B.Tech CSE, Semester 5, Sec A |
| **Student** | Tim Berners-Lee | `tim@uniflow.edu` | `STU002` | B.Tech CSE, Semester 5, Sec A |

When `simulate_workload.js` is run, 3 additional faculty members are created:
- Dr. John Doe (`john@uniflow.edu`, `FAC002` re-used customId)
- Dr. Jane Smith (`jane@uniflow.edu`, `FAC003`)
- Dr. Alan Walker (`alan@uniflow.edu`, `FAC004`)
