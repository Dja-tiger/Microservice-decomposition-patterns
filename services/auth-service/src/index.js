const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

function makeToken(userId) {
  return `user:${userId}`;
}

function parseToken(headerValue) {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  if (!token.startsWith("user:")) return null;
  const userId = token.slice("user:".length);
  return { userId };
}

app.post("/auth/token", (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res
      .status(400)
      .json({ code: "BAD_REQUEST", message: "user_id is required" });
  }
  const accessToken = makeToken(user_id);
  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600
  });
});

app.get("/auth/validate", (req, res) => {
  const authHeader = req.header("Authorization");
  const parsed = parseToken(authHeader);
  if (!parsed) {
    return res
      .status(401)
      .json({ code: "INVALID_TOKEN", message: "invalid or missing token" });
  }
  res.json({
    subject: parsed.userId
  });
});

const port = process.env.PORT || 8002;
app.listen(port, () => {
  console.log(`Auth Service listening on port ${port}`);
});
