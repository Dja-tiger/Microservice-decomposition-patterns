const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const messages = [];
let nextMsgId = 1;

const notificationBaseUrl =
  process.env.NOTIFICATION_BASE_URL || "http://notification-service:8004";

app.post("/dialogs/:userId/send", async (req, res) => {
  const toUserId = req.params.userId;
  const { from, text, reply_to } = req.body;

  if (!from || !text) {
    return res
      .status(400)
      .json({ code: "BAD_REQUEST", message: "from and text are required" });
  }

  const msg = {
    id: nextMsgId++,
    from,
    to: toUserId,
    text,
    reply_to: reply_to || null,
    ts: new Date().toISOString()
  };
  messages.push(msg);

  try {
    await axios.post(`${notificationBaseUrl}/notifications/message-created`, {
      message_id: msg.id,
      to_user_id: msg.to,
      ts: msg.ts
    });
  } catch (e) {
    console.error("Failed to notify notification-service:", e.message);
  }

  res.status(201).json(msg);
});

app.get("/dialogs/:userId/list", (req, res) => {
  const peerId = req.params.userId;
  const { current_user } = req.query;

  if (!current_user) {
    return res
      .status(400)
      .json({ code: "BAD_REQUEST", message: "current_user query param is required" });
  }

  const dialogMessages = messages.filter(
    m =>
      (m.from === current_user && m.to === peerId) ||
      (m.from === peerId && m.to === current_user)
  );

  res.json({
    total: dialogMessages.length,
    items: dialogMessages
  });
});

const port = process.env.PORT || 8003;
app.listen(port, () => {
  console.log(`Chat Service listening on port ${port}`);
});
