const bcrypt = require("bcryptjs");
const { User, Hostel, Room, Application, Complaint, Fee } = require("./models");

// Creates demo accounts and sample data (password for all: Pass@123).
async function seed() {
 await Promise.all([User.deleteMany({}),Hostel.deleteMany({}),Room.deleteMany({}),Application.deleteMany({}),Complaint.deleteMany({}),Fee.deleteMany({})]);
 const pass=await bcrypt.hash("Pass@123",10);
 const people=await User.create([
  {name:"System Administrator",email:"admin@hostel.com",password:pass,role:"Admin"},
  {name:"Priya Sharma",email:"warden@hostel.com",password:pass,role:"Hostel Warden"},
  {name:"Rahul Kumar",email:"student@hostel.com",password:pass,role:"Student",studentId:"SRU2026001",phone:"9876543210",department:"Computer Science",year:"3rd Year"},
  {name:"Maintenance Team",email:"staff@hostel.com",password:pass,role:"Maintenance Staff"}
 ]);
 const h=await Hostel.create([{name:"Aarav Boys Residence",location:"North Campus",blocks:3,description:"Modern residence for boys"},{name:"Saanvi Girls Residence",location:"South Campus",blocks:2,description:"Secure and comfortable residence"}]);
 const rooms=await Room.create([
  {hostel:h[0]._id,block:"A",roomNumber:"A-101",floor:1,capacity:3,occupied:2,type:"Triple Sharing",monthlyFee:5500},
  {hostel:h[0]._id,block:"A",roomNumber:"A-102",floor:1,capacity:2,occupied:1,type:"Double Sharing",monthlyFee:6500},
  {hostel:h[0]._id,block:"B",roomNumber:"B-201",floor:2,capacity:2,occupied:0,type:"Double Sharing",monthlyFee:6500},
  {hostel:h[1]._id,block:"A",roomNumber:"A-101",floor:1,capacity:3,occupied:1,type:"Triple Sharing",monthlyFee:5500}
 ]);
 await User.findByIdAndUpdate(people[2]._id,{room:rooms[0]._id});
 await Application.create([{student:people[2]._id,preferredHostel:"Aarav Boys Residence",roomType:"Double Sharing",reason:"Prefer a room close to the academic block",status:"Pending"}]);
 await Complaint.create([{student:people[2]._id,room:"A-101 (Block A)",category:"Electrical",priority:"High",description:"Reading light is not working",status:"In Progress",assignedTo:"Maintenance Team"},{student:people[2]._id,room:"A-101 (Block A)",category:"Plumbing",priority:"Normal",description:"Washroom tap needs repair",status:"Open"}]);
 await Fee.create([{student:people[2]._id,amount:5500,description:"November 2026 Hostel Fee",dueDate:new Date("2026-11-15"),status:"Pending"},{student:people[2]._id,amount:1000,description:"Security deposit",dueDate:new Date("2026-10-01"),status:"Paid",paidAt:new Date()}]);
 console.log("Seed complete. Demo password for all accounts: Pass@123");
}

// Runs automatically when the server starts and the database has no users yet.
async function seedIfEmpty() {
  if (process.env.AUTO_SEED === "false") return;
  if ((await User.countDocuments()) === 0) { console.log("Empty database found: adding demo data..."); await seed(); }
}
module.exports = { seed, seedIfEmpty };
