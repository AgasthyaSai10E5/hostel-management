require("dotenv").config();
const mongoose = require("mongoose");
const { seed } = require("./src/seedData");
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hostel_management");
  await seed();
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
