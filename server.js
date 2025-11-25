const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// for hosting sites (they set PORT in env) + local fallback
const PORT = process.env.PORT || 3002;

// parse JSON body (for login/register)
app.use(express.json());

// serve static files
app.use(express.static(path.join(__dirname, "public")));

// ---------- MONGODB SETUP ----------

// 🔐 For now, put your MongoDB connection string here TEMPORARILY.
// Example: const MONGO_URI = "mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/twis";
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://dasilvahinds_db_user:dasilva1@cluster0.rkje0e0.mongodb.net/twis=Cluster0";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// user schema
const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true },
  nicknameLower: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// message schema
const messageSchema = new mongoose.Schema({
  nickname: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// ---------- AUTH ROUTES ----------

// register
app.post("/auth/register", async (req, res) => {
  try {
    const { nickname, password } = req.body || {};

    if (!nickname || !password) {
      return res
        .status(400)
        .json({ error: "Nickname and password are required." });
    }

    const nicknameLower = nickname.toLowerCase();

    const existing = await User.findOne({ nicknameLower });
    if (existing) {
      return res.status(400).json({ error: "That nickname is already taken." });
    }

    await User.create({ nickname, nicknameLower, password });
    console.log("Registered:", nickname);

    return res.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error during registration." });
  }
});

// login
app.post("/auth/login", async (req, res) => {
  try {
    const { nickname, password } = req.body || {};

    if (!nickname || !password) {
      return res
        .status(400)
        .json({ error: "Nickname and password are required." });
    }

    const nicknameLower = nickname.toLowerCase();
    const user = await User.findOne({ nicknameLower });

    if (!user || user.password !== password) {
      return res.status(400).json({ error: "Wrong nickname or password." });
    }

    console.log("Logged in:", nickname);
    return res.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login." });
  }
});

// ---------- CHAT WITH DB ----------

io.on("connection", async (socket) => {
  console.log("user connected");

  // send last 100 messages from DB
  try {
    const msgs = await Message.find().sort({ time: 1 }).limit(100);
    socket.emit("chat history", msgs);
  } catch (err) {
    console.error("Fetch messages error:", err);
  }

  socket.on("chat message", async (msg) => {
    try {
      const cleanText = String(msg.text || "").trim();
      const cleanName = String(msg.nickname || "Anon").trim() || "Anon";

      if (!cleanText) return;

      const saved = await Message.create({
        nickname: cleanName,
        text: cleanText,
        time: new Date(),
      });

      io.emit("chat message", saved);
    } catch (err) {
      console.error("Save message error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Twis running on http://localhost:${PORT}`);
});
