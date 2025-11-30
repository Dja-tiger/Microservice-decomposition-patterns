const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for users
const users = new Map();
let nextId = 1;

app.post("/users/register", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res
      .status(400)
      .json({ code: "BAD_REQUEST", message: "name is required" });
  }

  for (const u of users.values()) {
    if (u.name === name) {
      return res
        .status(409)
        .json({ code: "NAME_TAKEN", message: "name already exists" });
    }
  }

  const id = nextId++;
  const user = { id, name, created_at: new Date().toISOString() };
  users.set(id.toString(), user);

  res.status(201).json({ user });
});

app.get("/users/:id", (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res
      .status(404)
      .json({ code: "NOT_FOUND", message: "user not found" });
  }
  res.json(user);
});

const port = process.env.PORT || 8001;
app.listen(port, () => {
  console.log(`Identity Service listening on port ${port}`);
});
