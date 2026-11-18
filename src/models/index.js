const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, "Enter a valid email address."] },
  password: { type: String, required: true },
  role: { type: String, enum: ["Admin","Hostel Warden","Student","Maintenance Staff"], default: "Student" },
  studentId: String, phone: { type: String, match: [/^$|^[0-9]{10}$/, "Phone number must be 10 digits."] }, department: String, year: String,
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },
  status: { type: String, enum: ["Active","Pending","Checked Out"], default: "Active" }
}, { timestamps: true });
const hostelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, location: String, blocks: { type: Number, min: [1, "Blocks must be at least 1."], default: 1 }, description: String
}, { timestamps: true });
const roomSchema = new mongoose.Schema({
  hostel: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel", required: true },
  block: { type: String, required: true }, roomNumber: { type: String, required: true },
  floor: { type: Number, default: 1 }, capacity: { type: Number, default: 2, min: [1, "Capacity must be at least 1."] },
  occupied: { type: Number, default: 0, min: 0 }, type: { type: String, default: "Shared" },
  monthlyFee: { type: Number, default: 5000, min: [0, "Fee cannot be negative."] }, status: { type: String, default: "Available" }
}, { timestamps: true });
const applicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  preferredHostel: String, roomType: String, reason: String,
  status: { type: String, enum: ["Pending","Approved","Rejected","Allocated"], default: "Pending" },
  allocatedRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null }
}, { timestamps: true });
const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  room: String, category: String, priority: { type: String, default: "Normal" },
  description: { type: String, required: [true, "Complaint description is required."], trim: true }, status: { type: String, enum: ["Open","In Progress","Resolved"], default: "Open" },
  assignedTo: String, resolution: String
}, { timestamps: true });
const feeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: [true, "Amount is required."], min: [1, "Amount must be greater than 0."] }, description: String, dueDate: Date,
  status: { type: String, enum: ["Paid","Pending","Overdue"], default: "Pending" },
  paidAt: Date, reference: String
}, { timestamps: true });

module.exports = {
  User: mongoose.model("User", userSchema),
  Hostel: mongoose.model("Hostel", hostelSchema),
  Room: mongoose.model("Room", roomSchema),
  Application: mongoose.model("Application", applicationSchema),
  Complaint: mongoose.model("Complaint", complaintSchema),
  Fee: mongoose.model("Fee", feeSchema)
};
