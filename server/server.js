const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const tripRoutes = require("./routes/tripRoutes");
const memberRoutes = require("./routes/memberRoutes");
const aiRoutes = require("./routes/aiRoutes");
const itineraryRoutes = require("./routes/itineraryRoutes");
const weatherRoutes = require("./routes/weatherRoutes");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({
    message: "TripSync API is running 🚀",
  });
});


app.use("/api/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/weather", weatherRoutes);

app.use("/api/ai", aiRoutes);
app.use("/api/itineraries", itineraryRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});