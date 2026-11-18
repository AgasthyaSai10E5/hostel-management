const API = '/api';
let token = localStorage.getItem('hh_token') || '';
let currentUser = JSON.parse(localStorage.getItem('hh_user') || 'null');
if (currentUser && !currentUser.id) currentUser.id = currentUser._id;
let page = 'dashboard';
let cache = {};

const $ = s => document.querySelector(s);
const esc = s => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(opts.headers || {})
    }
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function field(name, label, type = 'text', placeholder = '', required = false, extra = '') {
  return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" placeholder="${placeholder}" ${required ? 'required' : ''} ${extra}></div>`;
}

function loginView(register = false) {
  $('#app').innerHTML = `
  <div class="login-wrap">
    <section class="login-visual">
      <div class="brand"><span class="brand-mark">H</span>HostelHub</div>
      <div>
        <div class="role-pill" style="background:#ffffff20;color:#d9eaf8">CAMPUS LIVING, SIMPLIFIED</div>
        <h1>A better hostel experience starts here.</h1>
        <p>Role-tailored workspace for Students, Hostel Wardens, Maintenance Staff, and System Administrators.</p>
      </div>
      <div class="visual-foot">HOSTEL ALLOCATION &amp; MANAGEMENT SYSTEM &middot; 2026</div>
    </section>
    <section class="login-panel">
      <form class="login-card" id="authForm">
        <h2>${register ? 'Create student account' : 'Welcome back'}</h2>
        <p class="sub">${register ? 'Register as a student to apply for hostel accommodation.' : 'Sign in to access your role workspace.'}</p>
        ${register ? `
          ${field('name', 'Full name', 'text', 'e.g. Ananya Rao', true)}
          <div class="field-row">
            ${field('studentId', 'Student ID', 'text', 'e.g. SRU2026012', true, 'minlength="5" maxlength="20" title="5 to 20 letters or numbers"')}
            ${field('phone', 'Phone number', 'tel', 'e.g. 9876543210', true, 'pattern="[0-9]{10}" title="Enter 10 digits"')}
          </div>
          <div class="field-row">
            ${field('department', 'Department', 'text', 'e.g. Computer Science', true)}
            <div class="field"><label>Academic Year</label>
              <select name="year"><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></select>
            </div>
          </div>
        ` : ''}
        ${field('email', 'Email address', 'email', 'name@university.edu', true)}
        ${field('password', 'Password', 'password', 'At least 6 characters', true, 'minlength="6"')}
        <button class="btn primary block" type="submit">${register ? 'Create student account' : 'Sign in to workspace'} &rarr;</button>
        <p style="text-align:center;margin:20px 0;color:#718195">
          ${register ? 'Already registered?' : 'New student?'}
          <span class="text-link" id="toggleAuth">${register ? 'Sign in' : 'Create student account'}</span>
        </p>
        ${!register ? `
          <div class="demo-box">
            <b>Demo access &middot; password: Pass@123</b><br>
            Admin: admin@hostel.com<br>
            Warden: warden@hostel.com<br>
            Student: student@hostel.com<br>
            Maintenance: staff@hostel.com
          </div>
        ` : ''}
      </form>
    </section>
  </div>`;

  $('#toggleAuth').onclick = () => loginView(!register);
  $('#authForm').onsubmit = async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      const d = await api('/auth/' + (register ? 'register' : 'login'), { method: 'POST', body: JSON.stringify(body) });
      token = d.token;
      currentUser = d.user;
      localStorage.setItem('hh_token', token);
      localStorage.setItem('hh_user', JSON.stringify(currentUser));
      page = 'dashboard';
      renderShell();
    } catch (err) {
      toast(err.message);
    }
  };
}

const menus = [
  ['dashboard', '&#9638;', 'Dashboard', ['Admin', 'Hostel Warden', 'Student', 'Maintenance Staff']],
  ['users', '&#9881;', 'Users & Roles', ['Admin']],
  ['hostels', '&#8962;', 'Hostels & Rooms', ['Admin', 'Hostel Warden', 'Student', 'Maintenance Staff']],
  ['students', '&#9823;', 'Students & Check-In', ['Admin', 'Hostel Warden']],
  ['applications', '&#9636;', 'Applications', ['Admin', 'Hostel Warden', 'Student']],
  ['fees', '&#8377;', 'Fee Management', ['Admin', 'Hostel Warden', 'Student']],
  ['complaints', '&#9874;', 'Complaints', ['Admin', 'Hostel Warden', 'Student', 'Maintenance Staff']],
  ['reports', '&#9637;', 'Reports', ['Admin', 'Hostel Warden', 'Maintenance Staff']],
  ['profile', '&#9678;', 'My Profile', ['Admin', 'Hostel Warden', 'Student', 'Maintenance Staff']]
];

function isAdmin() { return currentUser?.role === 'Admin'; }
function isManager() { return ['Admin', 'Hostel Warden'].includes(currentUser?.role); }
function canAccess(roles) { return roles.includes(currentUser?.role); }

function renderShell() {
  if (!currentUser) { loginView(); return; }
  const allowedMenus = menus.filter(m => canAccess(m[3]));
  if (!allowedMenus.some(m => m[0] === page)) page = 'dashboard';

  $('#app').innerHTML = `
  <div class="shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><span class="brand-mark">H</span>HostelHub</div>
      <div class="nav-label">${esc(currentUser.role)} Menu</div>
      <nav class="nav">
        ${allowedMenus.map(m => `<button data-page="${m[0]}" class="${page === m[0] ? 'active' : ''}"><span class="ico">${m[1]}</span>${m[2]}</button>`).join('')}
      </nav>
      <div class="side-bottom">
        <div class="user-mini">
          <div class="avatar">${esc(currentUser.name?.[0] || 'U')}</div>
          <div><strong>${esc(currentUser.name)}</strong><small>${esc(currentUser.role)}</small></div>
        </div>
        <button class="nav" style="margin-top:13px;width:100%" id="logout">
          <span style="color:#c5d4e1;padding:9px 12px">&larr; &nbsp; Sign out</span>
        </button>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="mobile-menu" id="mobileMenu">&#9776;</button>
          <div class="crumb">HostelHub / <b>${allowedMenus.find(m => m[0] === page)?.[2] || 'Dashboard'}</b></div>
        </div>
        <div class="top-actions">
          <span class="role-pill">${esc(currentUser.role)}</span>
          <div class="avatar">${esc(currentUser.name?.[0] || 'U')}</div>
        </div>
      </header>
      <section class="content" id="content"><div class="empty">Loading...</div></section>
    </main>
  </div>`;

  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { page = b.dataset.page; renderShell(); });
  $('#logout').onclick = () => { token = ''; currentUser = null; localStorage.removeItem('hh_token'); localStorage.removeItem('hh_user'); loginView(); };
  $('#mobileMenu').onclick = () => $('#sidebar').classList.toggle('open');
  loadPage();
}

function head(title, desc, actions = '') {
  return `<div class="page-head"><div><h1>${title}</h1><p>${desc}</p></div><div class="head-actions">${actions}</div></div>`;
}
function btn(label, action, cls = 'primary') {
  return `<button class="btn ${cls}" data-action="${action}">${label}</button>`;
}
function stat(label, value, icon, note) {
  return `<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon}</span></div><strong>${value ?? '&mdash;'}</strong><small>${note || 'Updated just now'}</small></div>`;
}
function status(s) {
  let c = ['Paid', 'Resolved', 'Allocated', 'Approved', 'Active', 'Available'].includes(s) ? 'green'
    : ['Pending', 'Open', 'In Progress'].includes(s) ? 'amber'
    : ['Rejected', 'Overdue', 'Checked Out', 'Full', 'Urgent'].includes(s) ? 'red' : '';
  return `<span class="status ${c}">${esc(s || '—')}</span>`;
}

async function loadPage() {
  const c = $('#content');
  try {
    if (page === 'dashboard') await dashboard(c);
    else if (page === 'users') await usersPage(c);
    else if (page === 'hostels') await hostels(c);
    else if (page === 'students') await students(c);
    else if (page === 'applications') await applications(c);
    else if (page === 'fees') await fees(c);
    else if (page === 'complaints') await complaints(c);
    else if (page === 'reports') reports(c);
    else await profile(c);
  } catch (e) {
    c.innerHTML = `<div class="panel"><b>Unable to load this section</b><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`;
  }
}

async function dashboard(c) {
  const d = await api('/dashboard');
  const firstName = esc(currentUser.name.split(' ')[0]);

  if (d.role === 'Student') {
    const r = d.room;
    c.innerHTML = head(`Welcome, ${firstName}`, 'Your personal hostel room, fee ledger, and maintenance status.') +
      `<div class="stats">
        ${stat('Assigned Room', r ? r.roomNumber : 'Not Allocated', '&#8962;', r ? `${r.hostel?.name || ''} · Block ${r.block}` : 'Apply via Applications')}
        ${stat('Resident Status', d.studentStatus, '&#9823;', r ? `${r.type} (Floor ${r.floor})` : 'Awaiting room assignment')}
        ${stat('Pending Dues', '&#8377;' + Number(d.dueAmount || 0).toLocaleString('en-IN'), '&#8377;', `${d.pendingFees} unpaid invoice(s)`)}
        ${stat('Open Tickets', d.openComplaints, '&#9874;', 'Active maintenance requests')}
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>My Accommodation Details</h3>${status(r ? 'Allocated' : 'Pending')}</div>
          ${r ? `
            <div class="profile-row"><div style="flex:1;color:#778698">Hostel Building</div><b>${esc(r.hostel?.name || '—')} (${esc(r.hostel?.location || 'Campus')})</b></div>
            <div class="profile-row"><div style="flex:1;color:#778698">Room &amp; Block</div><b>${esc(r.roomNumber)} · Block ${esc(r.block)}, Floor ${r.floor}</b></div>
            <div class="profile-row"><div style="flex:1;color:#778698">Room Type &amp; Fee</div><b>${esc(r.type)} · &#8377;${Number(r.monthlyFee || 0).toLocaleString('en-IN')}/month</b></div>
          ` : `<div class="empty"><b>No room allocated yet</b>Submit a hostel application or browse available rooms.<br><br><button class="btn small primary" data-page="applications">Apply for Room &rarr;</button></div>`}
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Quick Student Actions</h3><span class="muted">Self-service</span></div>
          <div class="profile-row"><div class="stat-icon">&#9636;</div><div style="flex:1"><b>Room Applications</b><small>${d.pendingApplications} pending request(s)</small></div><button class="btn small light" data-page="applications">Open</button></div>
          <div class="profile-row"><div class="stat-icon">&#8377;</div><div style="flex:1"><b>Pay Hostel Fees</b><small>${d.pendingFees} pending payment(s)</small></div><button class="btn small light" data-page="fees">Open</button></div>
          <div class="profile-row"><div class="stat-icon">&#9874;</div><div style="flex:1"><b>Report Maintenance Issue</b><small>${d.openComplaints} open ticket(s)</small></div><button class="btn small light" data-page="complaints">Open</button></div>
        </div>
      </div>`;
    wireNav();
    return;
  }

  if (d.role === 'Maintenance Staff') {
    c.innerHTML = head(`Maintenance Desk — ${firstName}`, 'Track assigned repairs, urgent facility tickets, and resolution progress.') +
      `<div class="stats">
        ${stat('Open Tickets', d.openTickets, '&#9874;', 'Awaiting technician assignment')}
        ${stat('In Progress', d.inProgressTickets, '&#9881;', 'Currently being repaired')}
        ${stat('High / Urgent', d.urgentTickets, '!', 'Priority issues requiring action')}
        ${stat('Resolved Tickets', d.resolvedTickets, '&#10003;', 'Completed maintenance work')}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Active Maintenance Queue</h3><button class="btn small primary" data-page="complaints">Manage All Tickets &rarr;</button></div>
        ${d.recentComplaints?.length ? `<div class="table-wrap"><table><thead><tr><th>Ticket</th><th>Room</th><th>Student</th><th>Category</th><th>Priority</th><th>Assigned To</th><th>Status</th></tr></thead><tbody>
        ${d.recentComplaints.map(x => `<tr><td><b>#${String(x._id).slice(-6).toUpperCase()}</b></td><td><b>${esc(x.room || '—')}</b></td><td>${esc(x.student?.name || 'Student')}</td><td>${esc(x.category)}</td><td>${status(x.priority)}</td><td>${esc(x.assignedTo || 'Unassigned')}</td><td>${status(x.status)}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">No maintenance tickets found.</div>'}
      </div>`;
    wireNav();
    return;
  }

  const occ = d.occupancy;
  const apps = await api('/applications');
  const recent = apps.slice(0, 5);
  const bars = (d.hostelBreakdown || []).map(h => {
    const pct = h.capacity ? Math.round((h.occupied / h.capacity) * 100) : 0;
    return `<div class="bar-group"><span class="bar-val">${pct}%</span><div class="bar" style="height:${Math.max(8, pct)}%"></div><span class="bar-label">${esc(h.name)}</span></div>`;
  }).join('');

  c.innerHTML = head(`${d.role} Overview — ${firstName}`, 'Campus hostel occupancy, pending student allocations, and operational queues.') +
    `<div class="stats">
      ${stat('Total students', d.students, '&#9823;', 'Registered student residents')}
      ${stat('Hostels', d.hostels, '&#8962;', 'Active residential buildings')}
      ${stat('Available beds', d.vacant, '&#9638;', `${d.occupied} of ${d.capacity} beds occupied`)}
      ${stat('Open complaints', d.openComplaints, '&#9874;', 'Awaiting resolution')}
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Room occupancy &amp; hostel capacity</h3><span class="status green">${occ}% overall</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:center">
          <div style="display:flex;align-items:center;gap:18px;padding:8px 0">
            <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(#3478b9 ${occ}%,#eaf0f5 0);display:grid;place-items:center;flex-shrink:0">
              <div style="width:88px;height:88px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center">
                <div><b style="font:800 22px Manrope;color:#102b46">${occ}%</b><small style="display:block;color:#8291a1">Occupied</small></div>
              </div>
            </div>
            <div style="display:grid;gap:9px;font-size:12px">
              <span><i class="dot"></i>Occupied <b>${d.occupied}</b></span>
              <span><i class="dot" style="background:#e3eaf0"></i>Vacant <b>${d.vacant}</b></span>
              <span class="muted">Capacity: ${d.capacity} beds</span>
            </div>
          </div>
          <div>
            <div class="chart-wrap" style="height:130px;padding-top:5px">${bars || '<span class="muted">No hostels yet</span>'}</div>
            <div class="legend"><span><i class="dot"></i>Occupancy % by Hostel</span></div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Action centre</h3><span class="muted">Needs attention</span></div>
        <div class="profile-row"><div class="stat-icon">&#9636;</div><div style="flex:1"><b>${d.pendingApplications} pending applications</b><small>Review student accommodation requests</small></div><button class="btn small light" data-page="applications">View</button></div>
        <div class="profile-row"><div class="stat-icon">&#8377;</div><div style="flex:1"><b>${d.pendingFees} pending fee records</b><small>Track hostel fee payments</small></div><button class="btn small light" data-page="fees">View</button></div>
        <div class="profile-row"><div class="stat-icon">&#9874;</div><div style="flex:1"><b>${d.openComplaints} unresolved complaints</b><small>Monitor maintenance resolution</small></div><button class="btn small light" data-page="complaints">View</button></div>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><h3>Recent applications</h3><button class="btn small light" data-page="applications">View all &rarr;</button></div>
      ${recent.length ? `<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Preferred hostel</th><th>Room type</th><th>Submitted</th><th>Status</th></tr></thead><tbody>
      ${recent.map(a => `<tr><td><b>${esc(a.student?.name || 'Student')}</b></td><td>${esc(a.preferredHostel || '—')}</td><td>${esc(a.roomType || '—')}</td><td>${new Date(a.createdAt).toLocaleDateString()}</td><td>${status(a.status)}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">No applications yet.</div>'}
    </div>`;
  wireNav();
}

async function usersPage(c) {
  const list = await api('/users');
  c.innerHTML = head('Users & Role Administration', 'Provision Hostel Wardens, Maintenance Staff, and manage system account roles.', btn('+ Create Staff / User', 'add-user')) +
    `<div class="stats">
      ${stat('Total Accounts', list.length, '&#9881;', 'All registered users')}
      ${stat('Admins & Wardens', list.filter(u => ['Admin', 'Hostel Warden'].includes(u.role)).length, '&#8962;', 'Management staff')}
      ${stat('Maintenance Staff', list.filter(u => u.role === 'Maintenance Staff').length, '&#9874;', 'Facility technicians')}
      ${stat('Students', list.filter(u => u.role === 'Student').length, '&#9823;', 'Student accounts')}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>System User Directory</h3><span class="muted">${list.length} accounts</span></div>
      <div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>ID / Room</th><th>Change Role</th><th>Action</th></tr></thead><tbody>
      ${list.map(u => `<tr>
        <td><b>${esc(u.name)}</b></td>
        <td>${esc(u.email)}</td>
        <td>${status(u.role === 'Admin' ? 'Active' : u.role === 'Hostel Warden' ? 'Allocated' : u.role === 'Maintenance Staff' ? 'In Progress' : 'Pending')} <b>${esc(u.role)}</b></td>
        <td>${esc(u.studentId || 'Staff')} ${u.room ? `(${esc(u.room.roomNumber)})` : ''}</td>
        <td>${u._id === currentUser.id ? '<span class="muted">Current Admin</span>' : `
          <select data-role-user="${u._id}" style="padding:6px 8px;border:1px solid #dce4ec;border-radius:7px">
            ${['Admin', 'Hostel Warden', 'Maintenance Staff', 'Student'].map(r => `<option ${u.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>`}
        </td>
        <td>${u._id === currentUser.id ? '—' : `<button class="btn small danger" data-action="delete-user" data-id="${u._id}">Delete</button>`}</td>
      </tr>`).join('')}
      </tbody></table></div>
    </div>`;

  document.querySelectorAll('[data-role-user]').forEach(sel => {
    sel.onchange = async () => {
      try {
        await api(`/users/${sel.dataset.roleUser}/role`, { method: 'PATCH', body: JSON.stringify({ role: sel.value }) });
        toast('User role updated');
        loadPage();
      } catch (err) {
        toast(err.message);
      }
    };
  });
  wireActions();
}

async function hostels(c) {
  const [hs, rs] = await Promise.all([api('/hostels'), api('/rooms')]);
  cache.hostels = hs;
  cache.rooms = rs;
  c.innerHTML = head('Hostels & Rooms',
    isManager() ? 'Manage residential buildings, blocks, rooms, beds and capacity.' : 'Browse campus hostel buildings, room capacities, and current availability.',
    isManager() ? btn('+ Add hostel', 'add-hostel') + btn('+ Add room', 'add-room', 'light') : '') +
    `<div class="stats">
      ${stat('Hostel buildings', hs.length, '&#8962;', 'Across campus')}
      ${stat('Total rooms', rs.length, '&#9638;', 'Configured rooms')}
      ${stat('Total beds', rs.reduce((s, r) => s + r.capacity, 0), '&#9823;', 'Total bed capacity')}
      ${stat('Available beds', rs.reduce((s, r) => s + Math.max(0, r.capacity - r.occupied), 0), '&#10003;', 'Vacant beds')}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Room directory</h3><span class="muted">${rs.length} rooms</span></div>
      <div class="toolbar"><input id="roomSearch" placeholder="Search room or block..."><select id="hostelFilter"><option value="">All hostels</option>${hs.map(h => `<option>${esc(h.name)}</option>`).join('')}</select></div>
      <div class="table-wrap"><table><thead><tr><th>Room</th><th>Hostel</th><th>Block / Floor</th><th>Type</th><th>Occupancy</th><th>Monthly fee</th><th>Status</th>${isManager() ? '<th>Action</th>' : ''}</tr></thead><tbody id="roomRows">${roomRows(rs)}</tbody></table></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Hostel directory</h3></div>
      <div class="report-cards">${hs.map(h => `<div class="report-card"><h4>${esc(h.name)}</h4><p>${esc(h.description || 'Student accommodation')}<br>Location: ${esc(h.location || 'Campus')} &middot; ${h.blocks || 1} blocks</p><div style="display:flex;justify-content:space-between;align-items:center"><span class="status green">Active</span>${isAdmin() ? `<button class="btn small danger" data-action="delete-hostel" data-id="${h._id}">Delete</button>` : ''}</div></div>`).join('') || '<div class="empty">No hostels added.</div>'}</div>
    </div>`;
  $('#roomSearch').oninput = filterRooms;
  $('#hostelFilter').onchange = filterRooms;
  wireActions();
}

function roomRows(rs) {
  return rs.map(r => `<tr>
    <td><b>${esc(r.roomNumber)}</b></td>
    <td>${esc(r.hostel?.name || '—')}</td>
    <td>${esc(r.block)} / ${r.floor}</td>
    <td>${esc(r.type)}</td>
    <td>${r.occupied} / ${r.capacity}<div class="progress" style="width:90px;margin-top:5px"><span style="width:${r.capacity ? (100 * r.occupied) / r.capacity : 0}%"></span></div></td>
    <td>&#8377;${Number(r.monthlyFee || 0).toLocaleString('en-IN')}</td>
    <td>${status(r.occupied >= r.capacity ? 'Full' : 'Available')}</td>
    ${isManager() ? `<td><button class="btn small light" data-action="edit-room" data-id="${r._id}">Edit</button>${isAdmin() && r.occupied === 0 ? ` <button class="btn small danger" data-action="delete-room" data-id="${r._id}">Del</button>` : ''}</td>` : ''}
  </tr>`).join('') || '<tr><td colspan="8" class="empty">No rooms found.</td></tr>';
}

function filterRooms() {
  const q = $('#roomSearch').value.toLowerCase();
  const h = $('#hostelFilter').value;
  $('#roomRows').innerHTML = roomRows(cache.rooms.filter(r => (r.roomNumber + ' ' + r.block).toLowerCase().includes(q) && (!h || r.hostel?.name === h)));
  wireActions();
}

async function students(c) {
  const list = await api('/students');
  c.innerHTML = head('Student directory & check-in', 'Manage resident allocations, direct check-ins, and room check-outs.') +
    `<div class="panel">
      <div class="panel-head"><h3>Registered students</h3><span class="muted">${list.length} records</span></div>
      <div class="toolbar"><input id="studentSearch" placeholder="Search name, ID or department..."></div>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Student ID</th><th>Department</th><th>Contact</th><th>Room</th><th>Status</th><th>Action</th></tr></thead><tbody id="studentRows">${studentRows(list)}</tbody></table></div>
    </div>`;
  $('#studentSearch').oninput = () => {
    $('#studentRows').innerHTML = studentRows(list.filter(s => (s.name + s.studentId + s.department).toLowerCase().includes($('#studentSearch').value.toLowerCase())));
    wireActions();
  };
  wireActions();
}

function studentRows(a) {
  return a.map(s => `<tr>
    <td><b>${esc(s.name)}</b><br><span class="muted">${esc(s.email)}</span></td>
    <td>${esc(s.studentId || '—')}</td>
    <td>${esc(s.department || '—')}${s.year ? ` (${esc(s.year)})` : ''}</td>
    <td>${esc(s.phone || '—')}</td>
    <td>${s.room ? `${esc(s.room.roomNumber)} <small class="muted">(${esc(s.room.hostel?.name || '')})</small>` : 'Not allocated'}</td>
    <td>${status(s.status)}</td>
    <td>${s.room
      ? `<button class="btn small danger" data-action="checkout" data-id="${s._id}">Check out</button>`
      : `<button class="btn small primary" data-action="checkin" data-id="${s._id}">Check in</button>`}</td>
  </tr>`).join('') || '<tr><td colspan="7" class="empty">No students registered.</td></tr>';
}

async function applications(c) {
  const list = await api('/applications');
  c.innerHTML = head('Room applications', 'Review requests and allocate available rooms to students.', currentUser.role === 'Student' ? btn('+ New application', 'apply') : '') +
    `<div class="panel">
      <div class="panel-head"><h3>${currentUser.role === 'Student' ? 'My applications' : 'Application queue'}</h3><span class="muted">${list.length} records</span></div>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Preferred hostel</th><th>Room preference</th><th>Reason</th><th>Date</th><th>Status</th>${isManager() ? '<th>Action</th>' : ''}</tr></thead><tbody>
      ${list.map(a => `<tr>
        <td><b>${esc(a.student?.name || 'You')}</b><br><span class="muted">${esc(a.student?.studentId || a.student?.email || '')}</span></td>
        <td>${esc(a.preferredHostel || 'Any')}</td>
        <td>${esc(a.roomType || 'Any')}</td>
        <td style="white-space:normal;min-width:160px">${esc(a.reason || '—')}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
        <td>${status(a.status)}${a.allocatedRoom ? `<br><small>${esc(a.allocatedRoom.roomNumber)}</small>` : ''}</td>
        ${isManager() ? `<td>${a.status === 'Pending' ? `<button class="btn small light" data-action="approve" data-id="${a._id}">Allocate</button> <button class="btn small danger" data-action="reject" data-id="${a._id}">Reject</button>` : '—'}</td>` : ''}
      </tr>`).join('') || '<tr><td colspan="7" class="empty">No applications yet.</td></tr>'}
      </tbody></table></div>
    </div>`;
  wireActions();
}

async function fees(c) {
  const list = await api('/fees');
  c.innerHTML = head('Hostel fee management', 'Track dues, payments and fee history.', isManager() ? btn('+ Create fee record', 'add-fee') : '') +
    `<div class="stats">
      ${stat('Fee records', list.length, '&#8377;', 'All transactions')}
      ${stat('Paid', list.filter(f => f.status === 'Paid').length, '&#10003;', 'Settled records')}
      ${stat('Pending', list.filter(f => f.status !== 'Paid').length, '&#9719;', 'Awaiting payment')}
      ${stat('Outstanding amount', '&#8377;' + list.filter(f => f.status !== 'Paid').reduce((s, f) => s + (f.amount || 0), 0).toLocaleString('en-IN'), '!', 'Unpaid total')}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>${currentUser.role === 'Student' ? 'My fee ledger' : 'Fee ledger'}</h3></div>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Description</th><th>Amount</th><th>Due date</th><th>Status</th><th>Reference / action</th></tr></thead><tbody>
      ${list.map(f => `<tr>
        <td><b>${esc(f.student?.name || 'You')}</b><br><span class="muted">${esc(f.student?.studentId || '')}</span></td>
        <td>${esc(f.description || 'Hostel fee')}</td>
        <td>&#8377;${Number(f.amount || 0).toLocaleString('en-IN')}</td>
        <td>${f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—'}</td>
        <td>${status(f.status)}</td>
        <td>${f.status === 'Paid' ? esc(f.reference || 'Paid') : (currentUser.role === 'Student' ? `<button class="btn small primary" data-action="pay" data-id="${f._id}">Mark as paid</button>` : 'Awaiting payment')}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="empty">No fee records available.</td></tr>'}
      </tbody></table></div>
    </div>`;
  wireActions();
}

async function complaints(c) {
  const list = await api('/complaints');
  c.innerHTML = head('Maintenance & complaints', 'Report hostel issues and track resolution progress.', currentUser.role === 'Student' ? btn('+ Raise complaint', 'new-complaint') : '') +
    `<div class="panel">
      <div class="panel-head"><h3>${currentUser.role === 'Student' ? 'My complaints' : 'Complaint register'}</h3><span class="muted">${list.length} tickets</span></div>
      <div class="table-wrap"><table><thead><tr><th>Ticket</th><th>Student / Room</th><th>Category / priority</th><th>Description</th><th>Assigned to</th><th>Status</th>${currentUser.role !== 'Student' ? '<th>Update</th>' : ''}</tr></thead><tbody>
      ${list.map(x => `<tr>
        <td><b>#${String(x._id).slice(-6).toUpperCase()}</b><br><small class="muted">${new Date(x.createdAt).toLocaleDateString()}</small></td>
        <td><b>${esc(x.student?.name || 'You')}</b><br><small class="muted">${esc(x.room || '—')}</small></td>
        <td>${esc(x.category)}<br>${status(x.priority)}</td>
        <td style="white-space:normal;min-width:170px">${esc(x.description)}${x.resolution ? `<br><small style="color:#168568">Resolution: ${esc(x.resolution)}</small>` : ''}</td>
        <td>${esc(x.assignedTo || 'Unassigned')}</td>
        <td>${status(x.status)}</td>
        ${currentUser.role !== 'Student' ? `<td><button class="btn small light" data-action="update-complaint" data-id="${x._id}" data-status="${x.status}">Update</button></td>` : ''}
      </tr>`).join('') || '<tr><td colspan="7" class="empty">No complaints reported.</td></tr>'}
      </tbody></table></div>
    </div>`;
  wireActions();
}

function reports(c) {
  const allReports = [
    ['occupancy', 'Room Occupancy Report', 'Room-wise capacity, occupied beds and vacancies.', '&#9638;'],
    ['allocation', 'Student Allocation Report', 'Student details, assigned rooms and check-out status.', '&#9823;'],
    ['fees', 'Hostel Fee Report', 'Fee records, paid dues and outstanding amounts.', '&#8377;'],
    ['complaints', 'Complaint Status Report', 'Maintenance tickets with category and resolution status.', '&#9874;']
  ];
  const visibleReports = currentUser.role === 'Maintenance Staff'
    ? allReports.filter(r => r[0] === 'complaints')
    : allReports;

  c.innerHTML = head('Reports & insights', 'Generate, print or export operational hostel management reports.') +
    `<div class="report-cards">${visibleReports.map(r => `<div class="report-card"><div class="stat-icon" style="margin-bottom:15px">${r[3]}</div><h4>${r[1]}</h4><p>${r[2]}</p><button class="btn small primary" data-action="report" data-type="${r[0]}">Generate report &rarr;</button></div>`).join('')}</div>
    <div id="reportOutput"></div>`;
  wireActions();
}

async function profile(c) {
  const meData = await api('/auth/me');
  const u = meData.user || currentUser;
  c.innerHTML = head('My profile', 'Your account, role permissions, and contact information.') +
    `<div class="panel" style="max-width:650px">
      <div class="profile-row"><div class="avatar" style="width:48px;height:48px">${esc(u.name[0])}</div><div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div>
      ${[
        ['Account Role', u.role],
        ['Account ID', u._id || u.id || '—'],
        ...(u.studentId ? [['Student ID', u.studentId], ['Department & Year', `${u.department || '—'} (${u.year || '—'})`], ['Phone', u.phone || '—']] : []),
        ['Permissions Scope', u.role === 'Admin' ? 'Full system & user role control' : u.role === 'Hostel Warden' ? 'Hostel rooms, student check-in/out, applications & fees' : u.role === 'Maintenance Staff' ? 'Maintenance ticket queue & complaint reporting' : 'Room application, fee payment & complaint submission']
      ].map(x => `<div class="profile-row"><div style="flex:1;color:#778698">${x[0]}</div><b>${esc(x[1])}</b></div>`).join('')}
    </div>`;
}

function wireNav() {
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { page = b.dataset.page; renderShell(); });
}
function wireActions() {
  document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => handleAction(b.dataset.action, b.dataset.id, b.dataset.type, b.dataset.status));
}

function modal(title, body, onSubmit, label = 'Save') {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<form class="modal" id="modalForm"><div class="modal-head"><h3>${title}</h3><button type="button" class="close" id="closeModal">&times;</button></div>${body}<div class="modal-actions"><button type="button" class="btn ghost" id="cancelModal">Cancel</button><button class="btn primary" type="submit">${label}</button></div></form>`;
  document.body.append(wrap);
  const close = () => wrap.remove();
  $('#closeModal').onclick = close;
  $('#cancelModal').onclick = close;
  $('#modalForm').onsubmit = async e => {
    e.preventDefault();
    try {
      await onSubmit(Object.fromEntries(new FormData(e.target)));
      close();
      toast('Changes saved successfully');
      loadPage();
    } catch (err) {
      toast(err.message);
    }
  };
}

async function handleAction(a, id, type, old) {
  try {
    if (a === 'add-user') {
      modal('Create Staff / User Account',
        field('name', 'Full name', 'text', 'e.g. Suresh Verma', true) +
        field('email', 'Email address', 'email', 'suresh@hostel.com', true) +
        field('password', 'Temporary password', 'password', 'Minimum 6 characters', true, 'minlength="6"') +
        `<div class="field"><label>Assign Role</label><select name="role"><option>Hostel Warden</option><option>Maintenance Staff</option><option>Admin</option><option>Student</option></select></div>` +
        field('phone', 'Phone number', 'tel', '9876543210', false, 'pattern="[0-9]{10}" title="Enter 10 digits"'),
        d => api('/users', { method: 'POST', body: JSON.stringify(d) }),
        'Create Account'
      );
    }
    if (a === 'delete-user') {
      if (confirm('Permanently delete this user account?')) {
        await api('/users/' + id, { method: 'DELETE' });
        toast('User deleted');
        loadPage();
      }
    }
    if (a === 'add-hostel') {
      modal('Add hostel',
        field('name', 'Hostel name', 'text', 'e.g. Aarav Boys Residence', true) +
        field('location', 'Campus location', 'text', 'North Campus') +
        field('blocks', 'Number of blocks', 'number', '2', true, 'min="1"') +
        field('description', 'Description', 'text', 'Residential facility'),
        d => api('/hostels', { method: 'POST', body: JSON.stringify(d) })
      );
    }
    if (a === 'delete-hostel') {
      if (confirm('Delete this hostel building?')) {
        await api('/hostels/' + id, { method: 'DELETE' });
        toast('Hostel deleted');
        loadPage();
      }
    }
    if (a === 'add-room') {
      const hs = cache.hostels || await api('/hostels');
      modal('Add room',
        `<div class="field"><label>Hostel</label><select name="hostel" required>${hs.map(h => `<option value="${h._id}">${esc(h.name)}</option>`).join('')}</select></div>` +
        field('block', 'Block', 'text', 'A', true) +
        field('roomNumber', 'Room number', 'text', 'A-101', true) +
        field('floor', 'Floor', 'number', '1') +
        field('capacity', 'Bed capacity', 'number', '2', true, 'min="1" max="10"') +
        `<div class="field"><label>Room type</label><select name="type"><option>Double Sharing</option><option>Triple Sharing</option><option>Single</option></select></div>` +
        field('monthlyFee', 'Monthly fee (INR)', 'number', '5500'),
        d => api('/rooms', { method: 'POST', body: JSON.stringify({ ...d, floor: +d.floor, capacity: +d.capacity, monthlyFee: +d.monthlyFee }) })
      );
    }
    if (a === 'edit-room') {
      const r = cache.rooms.find(x => x._id === id);
      modal('Edit room',
        `<div class="field"><label>Room number</label><input name="roomNumber" value="${esc(r.roomNumber)}" required></div>` +
        `<div class="field"><label>Bed capacity</label><input name="capacity" type="number" min="1" max="10" value="${r.capacity}" required></div>` +
        `<div class="field"><label>Monthly fee (INR)</label><input name="monthlyFee" type="number" value="${r.monthlyFee}"></div>`,
        d => api('/rooms/' + id, { method: 'PUT', body: JSON.stringify({ ...d, capacity: +d.capacity, monthlyFee: +d.monthlyFee }) })
      );
    }
    if (a === 'delete-room') {
      if (confirm('Delete this vacant room?')) {
        await api('/rooms/' + id, { method: 'DELETE' });
        toast('Room deleted');
        loadPage();
      }
    }
    if (a === 'apply') {
      const hs = await api('/hostels');
      modal('New accommodation application',
        `<div class="field"><label>Preferred hostel</label><select name="preferredHostel"><option value="Any available">Any available</option>${hs.map(h => `<option>${esc(h.name)}</option>`).join('')}</select></div>` +
        `<div class="field"><label>Room preference</label><select name="roomType"><option>Any</option><option>Single</option><option>Double Sharing</option><option>Triple Sharing</option></select></div>` +
        `<div class="field"><label>Reason / additional information</label><textarea name="reason" rows="3" placeholder="Tell us about your accommodation needs"></textarea></div>`,
        d => api('/applications', { method: 'POST', body: JSON.stringify(d) }),
        'Submit application'
      );
    }
    if (a === 'approve') {
      const rs = await api('/rooms');
      const available = rs.filter(r => r.occupied < r.capacity);
      if (!available.length) throw new Error('No available beds. Add capacity or choose another room.');
      modal('Allocate a room',
        `<div class="field"><label>Select available room</label><select name="roomId" required>${available.map(r => `<option value="${r._id}">${esc(r.hostel?.name)} &middot; ${esc(r.roomNumber)} &middot; ${r.capacity - r.occupied} bed(s) available</option>`).join('')}</select></div>`,
        d => api('/applications/' + id, { method: 'PATCH', body: JSON.stringify(d) }),
        'Allocate bed'
      );
    }
    if (a === 'reject') {
      if (confirm('Reject this application?')) {
        await api('/applications/' + id, { method: 'PATCH', body: JSON.stringify({ status: 'Rejected' }) });
        toast('Application rejected');
        loadPage();
      }
    }
    if (a === 'checkin') {
      const rs = await api('/rooms');
      const available = rs.filter(r => r.occupied < r.capacity);
      if (!available.length) throw new Error('No vacant beds available for check-in.');
      modal('Student check-in',
        `<div class="field"><label>Assign vacant room</label><select name="roomId" required>${available.map(r => `<option value="${r._id}">${esc(r.hostel?.name)} &middot; ${esc(r.roomNumber)} (${r.capacity - r.occupied} vacant)</option>`).join('')}</select></div>`,
        d => api('/students/' + id + '/checkin', { method: 'PATCH', body: JSON.stringify(d) }),
        'Complete check-in'
      );
    }
    if (a === 'checkout') {
      if (confirm('Check out this student and release their bed?')) {
        await api('/students/' + id + '/checkout', { method: 'PATCH', body: '{}' });
        toast('Student checked out');
        loadPage();
      }
    }
    if (a === 'pay') {
      if (confirm('Mark this fee record as paid? (Demo workflow — no money will be charged)')) {
        await api('/fees/' + id + '/pay', { method: 'PATCH', body: '{}' });
        toast('Fee marked as paid');
        loadPage();
      }
    }
    if (a === 'add-fee') {
      const stus = await api('/students');
      modal('Create fee record',
        `<div class="field"><label>Student</label><select name="student" required>${stus.map(s => `<option value="${s._id}">${esc(s.name)} &middot; ${esc(s.studentId || s.email)}</option>`).join('')}</select></div>` +
        field('description', 'Description', 'text', 'Hostel fee', true) +
        field('amount', 'Amount (INR)', 'number', '5500', true, 'min="1"') +
        field('dueDate', 'Due date', 'date', '', true),
        d => api('/fees', { method: 'POST', body: JSON.stringify({ ...d, amount: +d.amount }) }),
        'Create record'
      );
    }
    if (a === 'new-complaint') {
      modal('Raise maintenance complaint',
        `<div class="field"><label>Issue category</label><select name="category"><option>Electrical</option><option>Plumbing</option><option>Furniture</option><option>Cleaning</option><option>Internet</option><option>Other</option></select></div>` +
        `<div class="field"><label>Priority</label><select name="priority"><option>Normal</option><option>High</option><option>Urgent</option></select></div>` +
        `<div class="field"><label>Description</label><textarea name="description" rows="4" required placeholder="Describe the issue and its location"></textarea></div>`,
        d => api('/complaints', { method: 'POST', body: JSON.stringify(d) }),
        'Submit ticket'
      );
    }
    if (a === 'update-complaint') {
      modal('Update complaint',
        `<div class="field"><label>Status</label><select name="status"><option ${old === 'Open' ? 'selected' : ''}>Open</option><option ${old === 'In Progress' ? 'selected' : ''}>In Progress</option><option ${old === 'Resolved' ? 'selected' : ''}>Resolved</option></select></div>` +
        field('assignedTo', 'Assigned to', 'text', 'Maintenance team') +
        `<div class="field"><label>Resolution notes</label><textarea name="resolution" rows="3" placeholder="Work completed / next steps"></textarea></div>`,
        d => api('/complaints/' + id, { method: 'PATCH', body: JSON.stringify(d) }),
        'Update ticket'
      );
    }
    if (a === 'report') await generateReport(type);
  } catch (e) {
    toast(e.message);
  }
}

async function generateReport(type) {
  try {
    const r = await api('/reports/' + type);
    const out = $('#reportOutput');
    const labels = {
      occupancy: 'Room Occupancy Report',
      allocation: 'Student Allocation Report',
      fees: 'Hostel Fee Report',
      complaints: 'Complaint Status Report'
    };
    let rows = [], headers = [];
    if (type === 'occupancy') {
      headers = ['Room', 'Hostel', 'Block', 'Capacity', 'Occupied', 'Vacant'];
      rows = r.data.map(x => [x.roomNumber, x.hostel?.name, x.block, x.capacity, x.occupied, x.capacity - x.occupied]);
    }
    if (type === 'allocation') {
      headers = ['Student', 'Student ID', 'Department', 'Room', 'Status'];
      rows = r.data.map(x => [x.name, x.studentId, x.department, x.room?.roomNumber || 'Not allocated', x.status]);
    }
    if (type === 'fees') {
      headers = ['Student', 'Description', 'Amount (INR)', 'Due date', 'Status'];
      rows = r.data.map(x => [x.student?.name, x.description, x.amount, x.dueDate ? new Date(x.dueDate).toLocaleDateString() : '', x.status]);
    }
    if (type === 'complaints') {
      headers = ['Student', 'Room', 'Category', 'Priority', 'Description', 'Assigned to', 'Status'];
      rows = r.data.map(x => [x.student?.name, x.room, x.category, x.priority, x.description, x.assignedTo, x.status]);
    }
    const table = `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${esc(v ?? '—')}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${headers.length}" class="empty">No records in this report.</td></tr>`}</tbody></table></div>`;
    out.innerHTML = `<div class="panel" id="printArea"><div class="panel-head"><div><h3>${labels[type]}</h3><small class="muted">Generated ${new Date(r.generatedAt).toLocaleString()} &middot; ${r.count} records</small></div><div>${btn('Print report', 'print', 'light')} ${btn('Export CSV', 'csv', 'primary')}</div></div>${table}</div>`;
    out.dataset.csv = JSON.stringify([headers, ...rows]);
    wireActions();
  } catch (e) {
    toast(e.message);
  }
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b && ['print', 'csv'].includes(b.dataset.action)) {
    if (b.dataset.action === 'print') window.print();
    else {
      const data = JSON.parse($('#reportOutput').dataset.csv);
      const csv = data.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'hostel-report.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }
});

(async function init() {
  if (token) {
    try {
      const d = await api('/auth/me');
      currentUser = { ...d.user, id: d.user._id };
      renderShell();
    } catch {
      token = '';
      localStorage.removeItem('hh_token');
      loginView();
    }
  } else {
    loginView();
  }
})();
