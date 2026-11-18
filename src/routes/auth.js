const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { protect } = require("../middleware/auth");
const sign = id => jwt.sign({ id }, process.env.JWT_SECRET || "development_secret_change_me", { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });

router.post("/register", async (req,res) => {
  try {
    const { name,password,studentId,phone,department,year } = req.body;
    const email = String(req.body.email || "").toLowerCase().trim();
    if (!name || !email || !password) return res.status(400).json({message:"Name, email and password are required."});
    if (password.length < 6) return res.status(400).json({message:"Password must contain at least 6 characters."});
    if (await User.findOne({email})) return res.status(409).json({message:"Email is already registered."});
    const user = await User.create({name,email,password:await bcrypt.hash(password,10),role:"Student",studentId,phone,department,year});
    res.status(201).json({token:sign(user._id),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
  } catch(e) { res.status(e.name==="ValidationError"?400:500).json({message:e.name==="ValidationError"?Object.values(e.errors).map(x=>x.message).join(" "):"Could not create account."}); }
});
router.post("/login", async (req,res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const {password} = req.body;
  const user = await User.findOne({email});
  if (!user || !(await bcrypt.compare(password || "",user.password))) return res.status(401).json({message:"Invalid email or password."});
  res.json({token:sign(user._id),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
});
router.get("/me", protect, (req,res) => res.json({user:req.user}));
module.exports = router;
