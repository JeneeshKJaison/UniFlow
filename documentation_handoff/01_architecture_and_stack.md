# UniFlow — System Architecture & Verified Technology Stack

## 1. Architectural Model & Multi-Tier Topology

UniFlow is structured according to a classical **3-Tier Enterprise Web Architecture**, separating concerns across presentation, business logic, and relational persistence.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION TIER                                │
│   [Super Admin Console]    [HOD Dashboard]    [Faculty Portal]    [Student] │
│   - Technologies: HTML5, CSS3, Vanilla JavaScript ES6+                     │
│   - Design System: Custom Glassmorphism (CSS custom properties / tokens)    │
│   - Analytics Engine: Chart.js 4.4.x (CDN loaded)                           │
│   - State Management: LocalStorage (Tokens, User session, Admin fallback)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON REST API calls
                                       │ Authorization: Bearer <JWT>
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            APPLICATION TIER                                 │
│   - Runtime & Framework: Node.js (v24.20.0) + Express 5.2.1                 │
│   - Middleware: cors, express.json(limit: 50mb), authMiddleware             │
│   - Core Business Logic Controllers:                                        │
│     * authController.js (Credential verification, token issuance)           │
│     * workloadController.js (HOD suggest, assign, L-T-P-J academic units)   │
│     * facultyController.js (Task updates, deliverables, student collision)  │
│     * studentController.js (Dashboard stats, courses, online turn-in)       │
│   - File Storage: Local filesystem static directory (`backend/uploads/`)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ PostgreSQL Connection Pool (pg-pool)
                                       │ Port 5432 / TCP
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATABASE TIER                                   │
│   - Database Engine: PostgreSQL 16+ (Relational, ACID compliant)            │
│   - Schema Scope: 15 Tables (10 Core Operational + 5 Academic Analytics)    │
│   - Query Strategies: Parameterized SQL, JSON Aggregation (json_agg),        │
│     Time-Series Scanners (generate_series), Atomic Transactions (BEGIN/COMMIT)
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Verified Technology Stack Specification

Every library, runtime, and package in UniFlow has been audited directly against the workspace files:

### 2.1 Presentation Tier (Frontend)
- **Markup & Semantics:** HTML5 (`UI/index.html`, `UI/admin/dashboard.html`, `UI/hod/dashboard.html`, `UI/faculty/dashboard.html`, `UI/student/dashboard.html`).
- **Styling Architecture:** Vanilla CSS3 with zero utility frameworks (no Tailwind CSS, no Bootstrap).
  - *Design Paradigm:* Glassmorphism Design System.
  - *CSS Custom Tokens:* Defined in `:root` (`--primary-color: #0b7a75`, `--accent-teal: #14b8a6`, `--glass-bg: rgba(255, 255, 255, 0.08)`, `--glass-border: rgba(255, 255, 255, 0.15)`, `--text-light: #94a3b8`).
  - *Responsiveness:* Fluid CSS Grid and Flexbox layouts.
- **Client-Side Scripting:** Vanilla JavaScript (ES6+ standard).
  - No frontend frameworks (no React, Angular, Vue, or Next.js).
  - Direct DOM manipulation via `document.getElementById`, `document.querySelectorAll`, and event listeners.
- **Data Visualization Library:** **Chart.js** (v4.x loaded via CDN in `UI/hod/dashboard.html`):
  `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`
  - Used in HOD dashboard for animated bar graphs displaying `grand_total_workload_units` and drill-down metrics.
- **Typography & Iconography:**
  - Google Fonts: `Inter` (sans-serif typography).
  - Google Material Symbols Outlined (`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" />`).

### 2.2 Application Tier (Backend)
- **Runtime Environment:** Node.js (audited local runtime version: `v24.20.0`).
- **Web Framework:** Express 5.x (`"express": "^5.2.1"` in `backend/package.json`).
- **Middleware Pipeline (`backend/src/server.js`):**
  1. `cors()`: Cross-Origin Resource Sharing enabled for cross-origin requests from Live Server (`http://localhost:5500` $\rightarrow$ `http://localhost:5000`).
  2. `express.json({ limit: '50mb' })`: Extended JSON body parsing to accommodate base64 deliverable file uploads.
  3. `express.urlencoded({ extended: true, limit: '50mb' })`: URL-encoded payload handling.
  4. `express.static(uploadsDir)`: Static asset serving mounted at `/uploads` routing to `backend/uploads/`.
  5. Route dispatchers mounted at:
     - `/api/auth` $\rightarrow$ `authRoutes.js`
     - `/api/workload` $\rightarrow$ `workloadRoutes.js`
     - `/api/faculty` $\rightarrow$ `facultyRoutes.js`
     - `/api/student` $\rightarrow$ `studentRoutes.js`
- **Authentication & Cryptography:**
  - `jsonwebtoken` (`^9.0.3`): Signs and verifies stateless HS256 tokens.
  - `bcryptjs` (`^3.0.3`): Password hashing using 10 salt rounds (`bcrypt.genSalt(10)`).

### 2.3 Persistence Tier (Database)
- **Database Engine:** PostgreSQL 16+.
- **Database Client Driver:** `pg` (`^8.23.0`).
- **Connection Architecture:** Managed connection pooling via `pg.Pool` in `backend/src/config/db.js`:
  ```javascript
  const pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'uniflow',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
  });
  ```

### 2.4 Declared Dependencies Audit

| Package Name | Declared in `package.json` | Actually Imported & Used | Critical Role in System |
| :--- | :---: | :---: | :--- |
| `express` | `^5.2.1` | **YES** | HTTP REST server, routing, static file server. |
| `pg` | `^8.23.0` | **YES** | PostgreSQL client connection pooling & query execution. |
| `jsonwebtoken` | `^9.0.3` | **YES** | JWT token generation (`sign`) and middleware validation (`verify`). |
| `bcryptjs` | `^3.0.3` | **YES** | Password hashing during seeding and authentication comparison. |
| `cors` | `^2.8.6` | **YES** | Enables API requests across different origins (ports 5500 and 5000). |
| `dotenv` | `^17.4.2` | **YES** | Environment variable injection from `backend/.env`. |
| `nodemon` (dev) | `^3.1.14` | **YES** | Automatic server restart during backend development. |

---

## 3. Request Lifecycle & Authentication Flow

### 3.1 Authentication Handshake (`POST /api/auth/login`)
1. **Client Submission:** User enters email and plaintext password in `UI/index.html`.
2. **Controller Interception (`authController.js`):**
   - Query: `SELECT * FROM users WHERE email = $1`.
   - Hash Verification: `bcrypt.compare(password, user.password_hash)`.
   - Token Generation: `jwt.sign({ userId: user.id, email: user.email, role: user.role, isHod: user.is_hod }, JWT_SECRET, { expiresIn: '24h' })`.
3. **Client Session Storage:**
   - Client stores token in `localStorage.setItem('uniflow_token', token)`.
   - Client stores user profile in `localStorage.setItem('uniflow_currentUser', JSON.stringify(user))`.
   - Redirects to designated dashboard (`UI/admin/dashboard.html`, `UI/hod/dashboard.html`, `UI/faculty/dashboard.html`, or `UI/student/dashboard.html`).

### 3.2 Route Guarding (`authMiddleware.js`)
Protected routes execute `authenticateToken` middleware:
1. Extracts `authHeader = req.headers['authorization']`.
2. Token extracted via regex or split: `authHeader.split(' ')[1]`.
3. Validated via `jwt.verify(token, JWT_SECRET)`.
4. Decoded payload attached to request object: `req.user = user`.
5. Returns `401 Unauthorized` if token is missing, or `403 Forbidden` if signature is invalid or expired.

```
[ Browser UI ] ──(Request + Bearer Token)──► [ Express Router ]
                                                     │
                                            [ authMiddleware ]
                                             ├─ Invalid/Missing ──► HTTP 401/403
                                             └─ Valid Signature
                                                     │
                                            [ Controller Logic ]
                                                     │
                                            [ PostgreSQL Query ]
                                                     │
                                            [ JSON Response ] ────► [ Client UI ]
```

---

## 4. Deliverable File Upload Architecture

UniFlow implements a deliverable file submission subsystem for faculty task deliverables (`POST /api/faculty/tasks/:id/deliverable`):

1. **Client-Side File Ingestion:** In `UI/faculty/js/faculty.js`, when a faculty member selects a file (PDF, DOCX, ZIP, image) in the modal, JavaScript reads the file using `FileReader.readAsDataURL(file)`.
2. **Payload Serialization:** The file is encoded into a Base64 data URI string and included in the JSON payload:
   ```json
   {
       "status": "completed",
       "faculty_remark": "Completed lecture notes and exam solutions.",
       "filename": "OS_Exam_Solutions.pdf",
       "file_data": "data:application/pdf;base64,JVBERi0xLjQK..."
   }
   ```
3. **Server-Side File Persistence (`facultyController.js`):**
   - Strips base64 header (`data:*;base64,`).
   - Converts to binary buffer via `Buffer.from(cleanBase64, 'base64')`.
   - Generates sanitized filesystem name: `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`.
   - Synchronously writes binary buffer to `backend/uploads/` via `fs.writeFileSync`.
4. **Database Record Update:**
   - Writes `attachment_url = 'http://localhost:5000/uploads/' + safeName`.
   - Writes `attachment_filename = filename`.
   - Sets `completed_at = NOW()` if status is completed.
5. **Retrieval & Download:**
   - Static Express handler routes `GET /uploads/:filename` directly to the `backend/uploads/` directory.
   - HOD dashboard renders an active download anchor (`<a href="attachment_url" target="_blank">Download</a>`).

---

## 5. Architectural Data Flow Diagrams

### 5.1 Level 0 Context Diagram
```
                             Credentials / Login
               ┌──────────────────────────────────────────────┐
               │                                              ▼
       ┌───────────────┐                             ┌─────────────────┐
       │     Users     │ ◄────────────────────────── │                 │
       │ (Admin, HOD,  │        Auth JWT Token       │                 │
       │ Faculty, Stu) │                             │                 │
       └───────────────┘                             │                 │
               │                                     │                 │
               │ Tasks / Assignments / Deliverables  │     UNIFLOW     │
               │ Classes / Course Declarations       │   CORE ENGINE   │
               ▼                                     │                 │
       ┌───────────────┐                             │                 │
       │   Dashboards  │ ──────────────────────────► │                 │
       │   & Consoles  │                             │                 │
       └───────────────┘                             └────────┬────────┘
               ▲                                              │
               │           Analytics / Workload Reports       │
               └──────────────────────────────────────────────┘
```

### 5.2 Level 1 Data Flow Diagram (Operational Processes)
```
[ HOD User ]
     │
     ├──(1. Propose Task)──────────────────► [ Process 1.0: Workload Capacity Engine ]
     │                                            │
     │◄──(2. Overload / 409 Conflict / Alts)──────┤  (Checks 15-pt limit)
     │                                            ▼
     └──(3. Approve Safe Assignment)──────► [ Process 2.0: Task Persistence ]
                                                  │
                                                  ▼
                                            [( Database: tasks )]
                                                  │
[ Faculty User ]                                  │
     │                                            │
     ├──(4. Fetch Active Tasks & Calendar)◄───────┘
     │
     ├──(5. Submit Task Deliverable & File)──► [ Process 3.0: Deliverable Storage ]
     │                                            │
     │                                            ├──► [( File System: /uploads/ )]
     │                                            └──► [( Database: tasks.attachment_url )]
     │
     ├──(6. Declare Academic Class Load)────► [ Process 4.0: Academic Workload Engine ]
     │                                            │  (Computes L-T-P-J Formulation)
     │                                            ▼
     │                                      [( Database: workload_master, etc. )]
     │
     └──(7. Assign Student Work)────────────► [ Process 5.0: Student Collision Engine ]
                                                  │  (Checks 10-pt daily / 18-pt weekly)
                                                  ▼
                                            [( Database: student_assignments )]
                                                  │
[ Student User ]                                  ▼
     │                                      [( Database: student_assignment_submissions )]
     │                                            ▲
     ├──(8. View Workload Bar & Due Works)────────┤
     └──(9. Submit Assignment Turn-In)────────────┘
```
