require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./src/routes/auth");
const apiRoutes = require("./src/routes/api");
const { notFound, errorHandler } = require("./src/utils/errorHandler");
const { seedIfEmpty } = require("./src/seedData");

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.get("/health", (req, res) => res.json({ status: "ok", db: mongoose.connection.readyState === 1 }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api", notFound);
app.use(errorHandler);
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hostel_management";
mongoose.connect(MONGO)
  .then(async () => {
    console.log("✓ Connected to MongoDB");
    await seedIfEmpty();
    app.listen(PORT, () => console.log(`✓ Hostel system running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    console.error("Check MONGODB_URI in your .env file, then restart.");
    process.exit(1);
  });
