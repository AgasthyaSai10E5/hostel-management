// Central error handling: always answer with clean JSON.
exports.notFound = (req, res) => res.status(404).json({ message: "API route not found." });
exports.errorHandler = (err, req, res, next) => {
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(" ") });
  }
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid ID or value supplied." });
  if (err.code === 11000) return res.status(409).json({ message: "This record already exists." });
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : "Server error. Please try again." });
};
