const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/notifications/message-created", (req, res) => {
  const { message_id, to_user_id, ts } = req.body;
  console.log(
    `[Notification] new message_id=${message_id} for user=${to_user_id} at ${ts}`
  );
  res.status(202).json({ status: "queued" });
});

const port = process.env.PORT || 8004;
app.listen(port, () => {
  console.log(`Notification Service listening on port ${port}`);
});
