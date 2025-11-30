const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const IDENTITY_BASE_URL =
  process.env.IDENTITY_BASE_URL || "http://identity-service:8001";
const AUTH_BASE_URL = process.env.AUTH_BASE_URL || "http://auth-service:8002";
const CHAT_BASE_URL = process.env.CHAT_BASE_URL || "http://chat-service:8003";

function getAuthHeader(req) {
  return req.header("Authorization");
}

app.post("/api/v1/user/register", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ code: "BAD_REQUEST", message: "name is required" });
    }

    const userResp = await axios.post(`${IDENTITY_BASE_URL}/users/register`, {
      name
    });
    const user = userResp.data.user;

    const tokenResp = await axios.post(`${AUTH_BASE_URL}/auth/token`, {
      user_id: user.id.toString()
    });

    res.status(201).json({
      user,
      token: tokenResp.data
    });
  } catch (e) {
    console.error("Error in /api/v1/user/register:", e.message);
    if (e.response) {
      return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({ code: "INTERNAL_ERROR", message: "internal error" });
  }
});

async function authMiddleware(req, res, next) {
  try {
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return res
        .status(401)
        .json({ code: "UNAUTHORIZED", message: "missing Authorization header" });
    }

    const validateResp = await axios.get(`${AUTH_BASE_URL}/auth/validate`, {
      headers: { Authorization: authHeader }
    });

    req.subject = validateResp.data.subject;
    next();
  } catch (e) {
    if (e.response) {
      return res.status(e.response.status).json(e.response.data);
    }
    res
      .status(500)
      .json({ code: "INTERNAL_ERROR", message: "auth validate failed" });
  }
}

app.post("/api/v1/dialog/:userId/send", authMiddleware, async (req, res) => {
  try {
    const toUserId = req.params.userId;
    const { text, reply_to } = req.body;
    if (!text) {
      return res
        .status(400)
        .json({ code: "BAD_REQUEST", message: "text is required" });
    }

    const payload = {
      from: req.subject,
      text,
      reply_to: reply_to || null
    };

    const chatResp = await axios.post(
      `${CHAT_BASE_URL}/dialogs/${toUserId}/send`,
      payload
    );

    res.status(201).json(chatResp.data);
  } catch (e) {
    console.error("Error in /api/v1/dialog/:userId/send:", e.message);
    if (e.response) {
      return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({ code: "INTERNAL_ERROR", message: "internal error" });
  }
});

app.get("/api/v1/dialog/:userId/list", authMiddleware, async (req, res) => {
  try {
    const peerId = req.params.userId;
    const chatResp = await axios.get(
      `${CHAT_BASE_URL}/dialogs/${peerId}/list`,
      { params: { current_user: req.subject } }
    );
    res.json(chatResp.data);
  } catch (e) {
    console.error("Error in /api/v1/dialog/:userId/list:", e.message);
    if (e.response) {
      return res.status(e.response.status).json(e.response.data);
    }
    res.status(500).json({ code: "INTERNAL_ERROR", message: "internal error" });
  }
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`API Gateway listening on port ${port}`);
});
