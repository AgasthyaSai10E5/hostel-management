const router = require("express").Router();
require("../utils/asyncRoutes")(router); // catches errors from async handlers
const bcrypt = require("bcryptjs");
const { protect, allow } = require("../middleware/auth");
const { User, Hostel, Room, Application, Complaint, Fee } = require("../models");

router.get("/health", (req, res) => res.json({ status: "ok", service: "Hostel Management API" }));
router.use(protect);
const admin = allow("Admin");
const managers = allow("Admin", "Hostel Warden");
const staff = allow("Admin", "Hostel Warden", "Maintenance Staff");

router.get("/dashboard", async (req, res) => {
  const role = req.user.role;

  if (role === "Student") {
    const [me, apps, fees, complaints] = await Promise.all([
      User.findById(req.user._id).populate({ path: "room", populate: { path: "hostel", select: "name location" } }),
      Application.find({ student: req.user._id }).populate("allocatedRoom").sort("-createdAt"),
      Fee.find({ student: req.user._id }).sort("-createdAt"),
      Complaint.find({ student: req.user._id }).sort("-createdAt")
    ]);
    const unpaidFees = fees.filter(f => f.status !== "Paid");
    return res.json({
      role,
      room: me.room,
      studentStatus: me.status,
      pendingApplications: apps.filter(a => a.status === "Pending").length,
      pendingFees: unpaidFees.length,
      dueAmount: unpaidFees.reduce((s, f) => s + (f.amount || 0), 0),
      openComplaints: complaints.filter(c => c.status !== "Resolved").length,
      recentApplications: apps.slice(0, 5),
      recentComplaints: complaints.slice(0, 5)
    });
  }

  if (role === "Maintenance Staff") {
    const allComplaints = await Complaint.find().populate("student", "name studentId").sort("-createdAt");
    return res.json({
      role,
      openTickets: allComplaints.filter(c => c.status === "Open").length,
      inProgressTickets: allComplaints.filter(c => c.status === "In Progress").length,
      resolvedTickets: allComplaints.filter(c => c.status === "Resolved").length,
      urgentTickets: allComplaints.filter(c => c.status !== "Resolved" && ["Urgent", "High"].includes(c.priority)).length,
      recentComplaints: allComplaints.slice(0, 8)
    });
  }

  const [students, hostels, rooms, complaints, pendingApps, pendingFees, roomRows] = await Promise.all([
    User.countDocuments({ role: "Student" }),
    Hostel.countDocuments(),
    Room.countDocuments(),
    Complaint.countDocuments({ status: { $ne: "Resolved" } }),
    Application.countDocuments({ status: "Pending" }),
    Fee.countDocuments({ status: { $ne: "Paid" } }),
    Room.find().populate("hostel", "name").select("capacity occupied hostel")
  ]);

  const capacity = roomRows.reduce((s, r) => s + r.capacity, 0);
  const occupied = roomRows.reduce((s, r) => s + r.occupied, 0);
  const hostelMap = {};
  roomRows.forEach(r => {
    const hName = r.hostel?.name || "Unassigned";
    if (!hostelMap[hName]) hostelMap[hName] = { name: hName, capacity: 0, occupied: 0 };
    hostelMap[hName].capacity += r.capacity;
    hostelMap[hName].occupied += r.occupied;
  });

  res.json({
    role,
    students,
    hostels,
    rooms,
    openComplaints: complaints,
    pendingApplications: pendingApps,
    pendingFees,
    capacity,
    occupied,
    vacant: Math.max(0, capacity - occupied),
    occupancy: capacity ? Math.round((occupied / capacity) * 100) : 0,
    hostelBreakdown: Object.values(hostelMap)
  });
});

router.get("/users", admin, async (req, res) => {
  res.json(await User.find().select("-password").populate("room", "roomNumber").sort("-createdAt"));
});

router.post("/users", admin, async (req, res) => {
  const { name, email, password, role, studentId, phone, department, year } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ message: "Name, email, password and role are required." });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: "Email already registered." });
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role,
    studentId,
    phone,
    department,
    year
  });
  res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

router.patch("/users/:id/role", admin, async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: "You cannot change your own role." });
  const u = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true, runValidators: true }).select("-password");
  if (!u) return res.status(404).json({ message: "User not found." });
  res.json(u);
});

router.delete("/users/:id", admin, async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: "You cannot delete your own account." });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: "User not found." });
  if (u.room) return res.status(400).json({ message: "Check out this student from their room before deleting." });
  await u.deleteOne();
  res.json({ message: "User deleted." });
});

router.get("/hostels", async (req, res) => res.json(await Hostel.find().sort("name")));
router.post("/hostels", managers, async (req, res) => res.status(201).json(await Hostel.create(req.body)));
router.put("/hostels/:id", managers, async (req, res) =>
  res.json(await Hostel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }))
);
router.delete("/hostels/:id", admin, async (req, res) => {
  if (await Room.exists({ hostel: req.params.id })) {
    return res.status(400).json({ message: "Remove its rooms before deleting this hostel." });
  }
  await Hostel.findByIdAndDelete(req.params.id);
  res.json({ message: "Hostel deleted." });
});

router.get("/rooms", async (req, res) =>
  res.json(await Room.find().populate("hostel", "name").sort("block roomNumber"))
);
router.post("/rooms", managers, async (req, res) => {
  delete req.body.occupied; // occupancy is controlled only by allocation / check-in
  const r = await Room.create(req.body);
  res.status(201).json(await r.populate("hostel", "name"));
});
router.put("/rooms/:id", managers, async (req, res) => {
  const r = await Room.findById(req.params.id);
  if (!r) return res.status(404).json({ message: "Room not found." });
  if (req.body.capacity !== undefined && Number(req.body.capacity) < r.occupied) {
    return res.status(400).json({ message: "Capacity cannot be lower than current occupancy." });
  }
  delete req.body.occupied;
  Object.assign(r, req.body);
  r.status = r.occupied >= r.capacity ? "Full" : "Available";
  await r.save();
  res.json(r);
});
router.delete("/rooms/:id", admin, async (req, res) => {
  const r = await Room.findById(req.params.id);
  if (!r) return res.status(404).json({ message: "Room not found." });
  if (r.occupied) return res.status(400).json({ message: "Cannot delete an occupied room." });
  await r.deleteOne();
  res.json({ message: "Room deleted." });
});

router.get("/students", managers, async (req, res) =>
  res.json(await User.find({ role: "Student" }).select("-password").populate({ path: "room", populate: { path: "hostel", select: "name" } }))
);

router.patch("/students/:id/checkin", managers, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role !== "Student") return res.status(404).json({ message: "Student not found." });
  if (u.room) return res.status(400).json({ message: "Student is already checked into a room." });
  const room = await Room.findById(req.body.roomId);
  if (!room) return res.status(404).json({ message: "Select a valid room." });
  if (room.occupied >= room.capacity) return res.status(400).json({ message: "Room is full." });
  room.occupied += 1;
  room.status = room.occupied >= room.capacity ? "Full" : "Available";
  await room.save();
  u.room = room._id;
  u.status = "Active";
  await u.save();
  res.json({ message: `Checked into ${room.roomNumber}.` });
});

router.patch("/students/:id/checkout", managers, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: "Student not found." });
  if (u.room) {
    const r = await Room.findById(u.room);
    if (r) {
      r.occupied = Math.max(0, r.occupied - 1);
      r.status = "Available";
      await r.save();
    }
  }
  u.room = null;
  u.status = "Checked Out";
  await u.save();
  res.json({ message: "Student checked out." });
});

router.get("/applications", allow("Admin", "Hostel Warden", "Student"), async (req, res) => {
  const q = req.user.role === "Student" ? { student: req.user._id } : {};
  res.json(
    await Application.find(q)
      .populate("student", "name email studentId")
      .populate({ path: "allocatedRoom", populate: { path: "hostel", select: "name" } })
      .sort("-createdAt")
  );
});

router.post("/applications", allow("Student"), async (req, res) => {
  const existing = await Application.findOne({ student: req.user._id, status: { $in: ["Pending", "Approved"] } });
  if (existing) return res.status(409).json({ message: "You already have an active application." });
  res.status(201).json(await Application.create({ ...req.body, student: req.user._id }));
});

router.patch("/applications/:id", managers, async (req, res) => {
  const a = await Application.findById(req.params.id);
  if (!a) return res.status(404).json({ message: "Application not found." });
  if (req.body.status === "Rejected") {
    a.status = "Rejected";
    await a.save();
    return res.json(a);
  }
  if (req.body.roomId) {
    const room = await Room.findById(req.body.roomId);
    if (!room) return res.status(404).json({ message: "Room not found." });
    if (room.occupied >= room.capacity) return res.status(400).json({ message: "This room is full." });
    if (a.status === "Allocated") return res.status(400).json({ message: "Application already allocated." });

    const student = await User.findById(a.student);
    if (student?.room) {
      const oldRoom = await Room.findById(student.room);
      if (oldRoom) {
        oldRoom.occupied = Math.max(0, oldRoom.occupied - 1);
        oldRoom.status = "Available";
        await oldRoom.save();
      }
    }
    room.occupied += 1;
    room.status = room.occupied >= room.capacity ? "Full" : "Available";
    await room.save();

    await User.findByIdAndUpdate(a.student, { room: room._id, status: "Active" });
    a.allocatedRoom = room._id;
    a.status = "Allocated";
    await a.save();
  } else {
    a.status = req.body.status || a.status;
    await a.save();
  }
  res.json(await a.populate("allocatedRoom"));
});

router.get("/complaints", async (req, res) => {
  const q = req.user.role === "Student" ? { student: req.user._id } : {};
  res.json(await Complaint.find(q).populate("student", "name studentId").sort("-createdAt"));
});

router.post("/complaints", allow("Student"), async (req, res) => {
  const studentWithRoom = await User.findById(req.user._id).populate("room", "roomNumber block");
  const roomLabel = studentWithRoom?.room
    ? `${studentWithRoom.room.roomNumber} (Block ${studentWithRoom.room.block})`
    : "Not allocated";
  res.status(201).json(await Complaint.create({ ...req.body, student: req.user._id, room: roomLabel }));
});

router.patch("/complaints/:id", staff, async (req, res) =>
  res.json(
    await Complaint.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, assignedTo: req.body.assignedTo, resolution: req.body.resolution },
      { new: true, runValidators: true }
    )
  )
);

router.get("/fees", allow("Admin", "Hostel Warden", "Student"), async (req, res) => {
  await Fee.updateMany({ status: "Pending", dueDate: { $lt: new Date() } }, { status: "Overdue" }); // auto-mark late fees
  const q = req.user.role === "Student" ? { student: req.user._id } : {};
  res.json(await Fee.find(q).populate("student", "name studentId").sort("-createdAt"));
});

router.post("/fees", managers, async (req, res) => {
  const s = await User.findOne({ _id: req.body.student, role: "Student" });
  if (!s) return res.status(404).json({ message: "Select a valid student." });
  res.status(201).json(await Fee.create(req.body));
});

router.patch("/fees/:id/pay", allow("Admin", "Hostel Warden", "Student"), async (req, res) => {
  const f = await Fee.findById(req.params.id);
  if (!f) return res.status(404).json({ message: "Fee record not found." });
  if (req.user.role === "Student" && String(f.student) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your fee record." });
  }
  if (f.status === "Paid") return res.status(400).json({ message: "This fee is already paid." });
  f.status = "Paid";
  f.paidAt = new Date();
  f.reference = "PAY-" + Date.now().toString().slice(-8);
  await f.save();
  res.json(f);
});

router.get("/reports/:type", staff, async (req, res) => {
  const type = req.params.type;
  if (req.user.role === "Maintenance Staff" && type !== "complaints") {
    return res.status(403).json({ message: "Maintenance Staff can only access the Complaint Status Report." });
  }
  let data = [];
  if (type === "occupancy") data = await Room.find().populate("hostel", "name");
  else if (type === "allocation")
    data = await User.find({ role: "Student" }).select("-password").populate({ path: "room", populate: { path: "hostel", select: "name" } });
  else if (type === "fees") data = await Fee.find().populate("student", "name studentId");
  else if (type === "complaints") data = await Complaint.find().populate("student", "name studentId");
  else return res.status(404).json({ message: "Unknown report." });
  res.json({ type, generatedAt: new Date(), count: data.length, data });
});

router.get("/health", (req, res) => res.json({ status: "ok", service: "Hostel Management API" }));
module.exports = router;
