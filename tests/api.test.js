// Automated API tests for HostelHub.
// Run the application first (npm start, Docker Compose or Kubernetes), then:  npm test
// Optional: BASE_URL=http://localhost:30080 npm test
const { test, describe, before } = require("node:test");
const assert = require("node:assert");

const BASE = process.env.BASE_URL || "http://localhost:5000";
const PASS = "Pass@123";
const FAKE_ID = "64b000000000000000000000";

async function call(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no JSON body */ }
  return { status: res.status, data };
}
async function login(email, password = PASS) { return call("POST", "/api/auth/login", { body: { email, password } }); }

const T = {}; // tokens and ids shared by the tests

describe("A. Authentication", () => {
  before(async () => {
    for (const [k, e] of [["admin", "admin@hostel.com"], ["warden", "warden@hostel.com"], ["student", "student@hostel.com"], ["staff", "staff@hostel.com"]]) {
      const r = await login(e);
      assert.strictEqual(r.status, 200, `demo account ${e} must exist (run npm run seed)`);
      T[k] = r.data.token; T[k + "Id"] = r.data.user.id;
    }
  });
  test("A-01 health check is available", async () => { const r = await call("GET", "/health"); assert.strictEqual(r.status, 200); assert.strictEqual(r.data.status, "ok"); });
  test("A-02 admin login returns token and role", async () => { const r = await login("admin@hostel.com"); assert.strictEqual(r.status, 200); assert.ok(r.data.token); assert.strictEqual(r.data.user.role, "Admin"); });
  test("A-03 each demo account has the right role", async () => {
    for (const [e, role] of [["warden@hostel.com", "Hostel Warden"], ["student@hostel.com", "Student"], ["staff@hostel.com", "Maintenance Staff"]]) {
      assert.strictEqual((await login(e)).data.user.role, role);
    }
  });
  test("A-04 wrong password is rejected (401)", async () => { assert.strictEqual((await login("admin@hostel.com", "wrong-pass")).status, 401); });
  test("A-05 unknown e-mail is rejected (401)", async () => { assert.strictEqual((await login("nobody@hostel.com")).status, 401); });
  test("A-06 e-mail login ignores capital letters", async () => { assert.strictEqual((await login("ADMIN@Hostel.com")).status, 200); });
  test("A-07 /me without a token returns 401", async () => { assert.strictEqual((await call("GET", "/api/auth/me")).status, 401); });
  test("A-08 /me with a token returns the user", async () => { const r = await call("GET", "/api/auth/me", { token: T.student }); assert.strictEqual(r.status, 200); assert.strictEqual(r.data.user.email, "student@hostel.com"); });
  test("A-09 forged token returns 401", async () => { assert.strictEqual((await call("GET", "/api/auth/me", { token: "abc.def.ghi" })).status, 401); });
});

describe("B. Registration", () => {
  const email = `test${Date.now()}@example.com`;
  test("B-01 registration with a short password returns 400", async () => {
    assert.strictEqual((await call("POST", "/api/auth/register", { body: { name: "Test", email, password: "123" } })).status, 400);
  });
  test("B-02 registration with a bad phone number returns 400", async () => {
    assert.strictEqual((await call("POST", "/api/auth/register", { body: { name: "Test", email, password: PASS, phone: "12345" } })).status, 400);
  });
  test("B-03 registration ignores a requested Admin role", async () => {
    const r = await call("POST", "/api/auth/register", { body: { name: "Test Student", email, password: PASS, role: "Admin", phone: "9876500000" } });
    assert.strictEqual(r.status, 201); assert.strictEqual(r.data.user.role, "Student");
  });
  test("B-04 registering the same e-mail again returns 409", async () => {
    assert.strictEqual((await call("POST", "/api/auth/register", { body: { name: "Test Student", email, password: PASS } })).status, 409);
  });
});

describe("C. Role-based access control", () => {
  test("C-01 student cannot list users (403)", async () => assert.strictEqual((await call("GET", "/api/users", { token: T.student })).status, 403));
  test("C-02 warden cannot list users (403)", async () => assert.strictEqual((await call("GET", "/api/users", { token: T.warden })).status, 403));
  test("C-03 admin can list users", async () => { const r = await call("GET", "/api/users", { token: T.admin }); assert.strictEqual(r.status, 200); assert.ok(r.data.length >= 4); });
  test("C-04 student cannot create a hostel (403)", async () => assert.strictEqual((await call("POST", "/api/hostels", { token: T.student, body: { name: "X" } })).status, 403));
  test("C-05 warden cannot delete a hostel (403)", async () => assert.strictEqual((await call("DELETE", `/api/hostels/${FAKE_ID}`, { token: T.warden })).status, 403));
  test("C-06 student cannot open the occupancy report (403)", async () => assert.strictEqual((await call("GET", "/api/reports/occupancy", { token: T.student })).status, 403));
  test("C-07 staff cannot open the fee report (403)", async () => assert.strictEqual((await call("GET", "/api/reports/fees", { token: T.staff })).status, 403));
  test("C-08 staff can open the complaint report", async () => { const r = await call("GET", "/api/reports/complaints", { token: T.staff }); assert.strictEqual(r.status, 200); assert.ok(Array.isArray(r.data.data)); });
  test("C-09 unauthenticated request to a protected route returns 401", async () => assert.strictEqual((await call("GET", "/api/rooms")).status, 401));
  test("C-10 unknown API route returns a JSON 404", async () => { const r = await call("GET", "/api/does-not-exist", { token: T.admin }); assert.strictEqual(r.status, 404); assert.ok(r.data.message); });
});

describe("D. Hostels, rooms and business rules", () => {
  test("D-01 any signed-in user can list hostels", async () => { const r = await call("GET", "/api/hostels", { token: T.student }); assert.strictEqual(r.status, 200); assert.ok(r.data.length >= 2); });
  test("D-02 hostel with zero blocks is rejected (400)", async () => assert.strictEqual((await call("POST", "/api/hostels", { token: T.admin, body: { name: "Bad", blocks: 0 } })).status, 400));
  test("D-03 create room: occupied count is ignored; capacity rule enforced; cleanup", async () => {
    const h = await call("POST", "/api/hostels", { token: T.admin, body: { name: "Test Hostel " + Date.now(), location: "Test", blocks: 1 } });
    assert.strictEqual(h.status, 201);
    const bad = await call("POST", "/api/rooms", { token: T.admin, body: { hostel: h.data._id, block: "T", roomNumber: "T-1", capacity: 0 } });
    assert.strictEqual(bad.status, 400);
    const r = await call("POST", "/api/rooms", { token: T.admin, body: { hostel: h.data._id, block: "T", roomNumber: "T-1", capacity: 2, occupied: 5 } });
    assert.strictEqual(r.status, 201); assert.strictEqual(r.data.occupied, 0);
    assert.strictEqual((await call("DELETE", `/api/hostels/${h.data._id}`, { token: T.admin })).status, 400); // still has a room
    assert.strictEqual((await call("DELETE", `/api/rooms/${r.data._id}`, { token: T.admin })).status, 200);
    assert.strictEqual((await call("DELETE", `/api/hostels/${h.data._id}`, { token: T.admin })).status, 200);
  });
  test("D-04 admin cannot delete their own account (400)", async () => assert.strictEqual((await call("DELETE", `/api/users/${T.adminId}`, { token: T.admin })).status, 400));
  test("D-05 dashboard returns occupancy figures for the admin", async () => { const r = await call("GET", "/api/dashboard", { token: T.admin }); assert.strictEqual(r.status, 200); assert.ok("occupancy" in r.data && "vacant" in r.data); });
  test("D-06 check-in of a student who already has a room is refused (400)", async () => assert.strictEqual((await call("PATCH", `/api/students/${T.studentId}/checkin`, { token: T.warden, body: { roomId: FAKE_ID } })).status, 400)); // student already has a room
});

describe("E. Student workflow: application, complaint and fee", () => {
  const email = `flow${Date.now()}@example.com`;
  let token;
  before(async () => {
    const r = await call("POST", "/api/auth/register", { body: { name: "Flow Student", email, password: PASS, phone: "9876511111", studentId: "FLOW" + Date.now() } });
    assert.strictEqual(r.status, 201); token = r.data.token;
  });
  test("E-01 student can submit one application (201)", async () => {
    assert.strictEqual((await call("POST", "/api/applications", { token, body: { preferredHostel: "Aarav Boys Residence", roomType: "Double Sharing", reason: "Test" } })).status, 201);
  });
  test("E-02 a second active application is rejected (409)", async () => {
    assert.strictEqual((await call("POST", "/api/applications", { token, body: { preferredHostel: "Aarav Boys Residence", roomType: "Double Sharing", reason: "Again" } })).status, 409);
  });
  test("E-03 warden cannot submit an application (403)", async () => assert.strictEqual((await call("POST", "/api/applications", { token: T.warden, body: {} })).status, 403));
  test("E-04 complaint without a description is rejected (400)", async () => assert.strictEqual((await call("POST", "/api/complaints", { token, body: { category: "Electrical" } })).status, 400));
  test("E-05 student can register a complaint (201)", async () => {
    const r = await call("POST", "/api/complaints", { token, body: { category: "Electrical", priority: "High", description: "Test complaint" } });
    assert.strictEqual(r.status, 201); assert.strictEqual(r.data.status, "Open");
  });
  test("E-06 student sees only their own fees", async () => { const r = await call("GET", "/api/fees", { token }); assert.strictEqual(r.status, 200); assert.strictEqual(r.data.length, 0); });
  test("E-07 student cannot pay another student's fee (403)", async () => {
    const fees = await call("GET", "/api/fees", { token: T.admin });
    assert.ok(fees.data.length > 0);
    assert.strictEqual((await call("PATCH", `/api/fees/${fees.data[0]._id}/pay`, { token })).status, 403);
  });
  test("E-08 fee for an unknown student is refused (404)", async () => assert.strictEqual((await call("POST", "/api/fees", { token: T.admin, body: { student: FAKE_ID, amount: 100 } })).status, 404));
  test("E-09 fee with zero amount is rejected (400)", async () => assert.strictEqual((await call("POST", "/api/fees", { token: T.admin, body: { student: T.studentId, amount: 0 } })).status, 400));
  test("E-10 maintenance staff can update a complaint", async () => {
    const list = await call("GET", "/api/complaints", { token: T.staff });
    const c = list.data.find(x => x.description === "Test complaint");
    assert.ok(c);
    const r = await call("PATCH", `/api/complaints/${c._id}`, { token: T.staff, body: { status: "In Progress", assignedTo: "Maintenance Team" } });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.data.status, "In Progress");
  });
});
