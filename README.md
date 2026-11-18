# Hostel Allocation and Management System (HostelHub)

**SR University | School of Computer Science & AI — DevOps & Full Stack Development (AY 2026–2027)**

## 1. Project Objectives
- Digitize campus hostel operations by replacing manual spreadsheets and paper registers with a centralized web application.
- Enforce strict role-based access control (RBAC) across four distinct user roles: **Admin**, **Hostel Warden**, **Student**, and **Maintenance Staff**.
- Provide real-time visibility into bed availability, room occupancy, student check-in/check-out lifecycle, hostel fee ledgers, and maintenance resolution.
- Enable instant generation, printing, and CSV export of the four mandatory administrative reports.

## 2. Functional & Technical Requirements
- **Minimum 8+ Screens:** Login, Student Registration, Role-Tailored Dashboard, Users & Roles (Admin), Hostels & Rooms, Students & Check-In/Out, Applications, Fee Management, Complaints, Reports, and Profile (11 distinct views).
- **Four User Roles:** Admin, Hostel Warden, Student, Maintenance Staff.
- **Four Mandatory Reports:** Room Occupancy Report, Student Allocation Report, Hostel Fee Report, and Complaint Status Report (with Print and CSV Export).
- **Tech Stack (summary):** Responsive HTML5/CSS3/Vanilla JS frontend, Node.js + Express REST API backend, MongoDB + Mongoose ODM, JWT authentication, Docker, and Kubernetes.

## 2a. Technology Stack
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript single-page app (responsive, client-side form validation) |
| Backend | Node.js, Express REST API, JWT authentication, bcrypt password hashing, helmet, rate limiting |
| Database | MongoDB with Mongoose schemas (validation rules in `src/models`) |
| DevOps | Git/GitHub, Docker, Docker Compose, Kubernetes (minikube / Docker Desktop) |

## 2b. Project Structure
```text
public/            Frontend (index.html, styles.css, app.js)
src/models/        Mongoose schemas and validation
src/routes/        REST API (auth.js, api.js)
src/middleware/    JWT login check + role-based authorization
src/utils/         Async error catching and central error handler
src/seedData.js    Demo data (auto-loaded when the database is empty)
k8s/               secret.yaml, mongo.yaml, app.yaml (Deployment + Service)
Dockerfile, docker-compose.yml, .dockerignore
```

## 3. System Architecture
```text
[Browser / Responsive SPA (public/)]
           │  HTTP / JSON + JWT Bearer Token
           ▼
[Node.js + Express REST API (server.js, src/routes/)]
           │  Role Middleware (src/middleware/auth.js)
           ▼
[Mongoose ODM Models (src/models/index.js)]
           │  TCP :27017
           ▼
[MongoDB Database (hostel_management)]
```

## 4. Database Design (MongoDB Collections)
1. **`users`**: `name`, `email` (unique), `password` (bcrypt hash), `role` (`Admin` | `Hostel Warden` | `Student` | `Maintenance Staff`), `studentId`, `phone`, `department`, `year`, `room` (ObjectId ref `Room`), `status` (`Active` | `Pending` | `Checked Out`).
2. **`hostels`**: `name`, `location`, `blocks`, `description`.
3. **`rooms`**: `hostel` (ObjectId ref `Hostel`), `block`, `roomNumber`, `floor`, `capacity`, `occupied`, `type`, `monthlyFee`, `status` (`Available` | `Full`).
4. **`applications`**: `student` (ObjectId ref `User`), `preferredHostel`, `roomType`, `reason`, `status` (`Pending` | `Approved` | `Rejected` | `Allocated`), `allocatedRoom` (ObjectId ref `Room`).
5. **`fees`**: `student` (ObjectId ref `User`), `amount`, `description`, `dueDate`, `status` (`Paid` | `Pending` | `Overdue`), `paidAt`, `reference`.
6. **`complaints`**: `student` (ObjectId ref `User`), `room`, `category`, `priority`, `description`, `status` (`Open` | `In Progress` | `Resolved`), `assignedTo`, `resolution`.

## 5. REST API Reference
All `/api/*` endpoints (except `/api/auth/login` and `/api/auth/register`) require `Authorization: Bearer <token>`.

| Method | Endpoint | Roles Allowed | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a new Student account |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT |
| `GET` | `/api/auth/me` | Authenticated | Fetch current user profile |
| `GET` | `/api/dashboard` | Authenticated | Role-specific summary cards & occupancy charts |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/users` | Admin | Provision staff/users, update roles, delete accounts |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/hostels` | All / Managers / Admin | Manage hostel buildings |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/rooms` | All / Managers / Admin | Manage rooms & bed capacity |
| `GET` | `/api/students` | Admin, Warden | List registered students & room assignments |
| `PATCH` | `/api/students/:id/checkin` | Admin, Warden | Check a student into a vacant room |
| `PATCH` | `/api/students/:id/checkout` | Admin, Warden | Check a student out & release their bed |
| `GET` / `POST` | `/api/applications` | Managers, Student | View applications or submit new request |
| `PATCH` | `/api/applications/:id` | Admin, Warden | Allocate a room or reject application |
| `GET` / `POST` | `/api/fees` | Managers, Student | View fee ledger or create fee record |
| `PATCH` | `/api/fees/:id/pay` | Managers, Student | Mark fee record as Paid |
| `GET` / `POST` | `/api/complaints` | All / Student | View or raise maintenance complaints |
| `PATCH` | `/api/complaints/:id` | Admin, Warden, Staff | Update complaint status & resolution notes |
| `GET` | `/api/reports/:type` | Admin, Warden, Staff | Generate `occupancy`, `allocation`, `fees`, or `complaints` report |

## 6. Local Setup Instructions
1. Install **Node.js 18+** and **MongoDB** (or use Docker, see section 8).
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` (check `MONGODB_URI`).
4. Start the server: `npm start`. On the first start the database is empty, so **demo users and sample data are added automatically**. To reset the data later run `npm run seed`.
5. Open `http://localhost:5000`.

## 7. Implementation Notes
- **Validation:** forms use HTML validation (required, 10-digit phone, minimum password length, minimum capacity); the API repeats the checks with Mongoose rules, so bad data is rejected even if someone calls the API directly.
- **Error handling:** every async route is wrapped, and one central handler returns clear JSON messages (400 validation, 401 login, 403 permission, 404 not found, 409 duplicate, 500 server).
- **Business rules:** a room cannot be over-filled, capacity cannot go below current occupancy, occupied rooms cannot be deleted, a student cannot hold two active applications, late fees are marked *Overdue* automatically.
- **Security:** bcrypt hashed passwords, JWT tokens, role checks on every protected route, registration always creates a Student account.

## 8. Testing & Demo Verification
All demo accounts use password **`Pass@123`**:
| Role | Email | What to test |
|---|---|---|
| Admin | `admin@hostel.com` | Users & roles, hostels/rooms, all 4 reports |
| Hostel Warden | `warden@hostel.com` | Allocate rooms, check-in/out, create fees |
| Student | `student@hostel.com` | Apply for room, pay fee, raise complaint |
| Maintenance Staff | `staff@hostel.com` | Update complaints, Complaint Status Report |

Manual test checklist: register a new student, log in as the student and apply for a room, log in as the warden and allocate it, check the student's room appears, raise a complaint as the student, resolve it as staff, generate and export each report, try a wrong role action (expect a 403 message), submit invalid forms (expect validation messages).
Health check: `GET /health` returns `{"status":"ok","db":true}`.

## 9. GitHub (Version Control)
```bash
git init
git add .gitignore package.json .env.example && git commit -m "chore: initialise Node project"
git add src/models src/middleware && git commit -m "feat: add database models and role-based middleware"
git add src/routes src/utils server.js && git commit -m "feat: add REST API with validation and error handling"
git add src/seedData.js seed.js && git commit -m "feat: add demo data seeding"
git add public && git commit -m "feat: add responsive frontend with dashboards and reports"
git add Dockerfile .dockerignore docker-compose.yml && git commit -m "devops: add Docker and Compose setup"
git add k8s && git commit -m "devops: add Kubernetes deployments and services"
git add README.md && git commit -m "docs: add full project documentation"
git branch -M main
git remote add origin https://github.com/<your-username>/hostel-management.git
git push -u origin main
```
Never commit `.env` (it is already in `.gitignore`).

## 10. Docker
```bash
docker compose up --build        # builds the image and starts app + MongoDB
```
Open `http://localhost:5000`. Stop with `docker compose down` (add `-v` to delete data).
Build the image only: `docker build -t hostel-management:latest .`

## 11. Kubernetes
```bash
docker build -t hostel-management:latest .
# minikube only: minikube image load hostel-management:latest
kubectl apply -f k8s/
kubectl get pods            # wait until all pods show Running / 1/1
kubectl get services
```
Open `http://localhost:30080` (Docker Desktop) or run `minikube service hostel-management`.
Remove everything: `kubectl delete -f k8s/`.

## 12. Troubleshooting
| Problem | Fix |
|---|---|
| Cannot log in | The database was empty before seeding. Restart the server or run `npm run seed` |
| `MongoDB connection failed` | Start MongoDB, or check `MONGODB_URI` in `.env` |
| Pod shows `ImagePullBackOff` | Build the image locally first (and `minikube image load` for minikube) |
| Port 5000 busy | Change `PORT` in `.env` |
