const express = require("express");
const { pool } = require("../db");
const router = express.Router();

function requireAdminOrLead(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (!["admin", "team_lead"].includes(req.user.role))
    return res.status(403).json({ error: "Admin or team lead only" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Admin only" });
  next();
}

function parseIntParam(val, name) {
  const n = Number(val);
  if (!Number.isInteger(n) || n <= 0)
    throw Object.assign(new Error(`Invalid ${name}`), { status: 400 });
  return n;
}

// Resolve team_id for the calling team_lead (null if admin or no assignment)
async function getCallerTeamId(user) {
  if (user.role !== "team_lead") return null;
  const result = await pool.query(
    "SELECT team_id FROM team_members WHERE user_id = $1",
    [user.id],
  );
  return result.rows[0]?.team_id ?? null;
}

// List teams — admin sees all; team_lead sees only their own team
router.get("/", requireAdminOrLead, async (req, res) => {
  if (req.user.role === "team_lead") {
    const callerTeamId = await getCallerTeamId(req.user);
    if (!callerTeamId) return res.json([]);
    const result = await pool.query(
      `SELECT t.id, t.name, t.description, t.created_at,
         COUNT(tm.user_id) AS member_count
       FROM teams t
       LEFT JOIN team_members tm ON tm.team_id = t.id
       WHERE t.id = $1
       GROUP BY t.id`,
      [callerTeamId],
    );
    return res.json(result.rows);
  }

  const result = await pool.query(`
    SELECT t.id, t.name, t.description, t.created_at,
      COUNT(tm.user_id) AS member_count
    FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id
    GROUP BY t.id
    ORDER BY t.name
  `);
  res.json(result.rows);
});

// Get single team with members — team_lead can only view their own team
router.get("/:id", requireAdminOrLead, async (req, res) => {
  let teamId;
  try {
    teamId = parseIntParam(req.params.id, "team id");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  if (req.user.role === "team_lead") {
    const callerTeamId = await getCallerTeamId(req.user);
    if (callerTeamId !== teamId)
      return res.status(403).json({ error: "Access denied" });
  }

  const teamResult = await pool.query("SELECT * FROM teams WHERE id = $1", [
    teamId,
  ]);
  const team = teamResult.rows[0];
  if (!team) return res.status(404).json({ error: "Team not found" });

  const members = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, tm.is_lead, tm.joined_at
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = $1
     ORDER BY u.name`,
    [team.id],
  );
  res.json({ ...team, members: members.rows });
});

// Create team
router.post("/", requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Team name is required" });

  const result = await pool.query(
    "INSERT INTO teams (name, description) VALUES ($1, $2) RETURNING *",
    [name.trim(), description?.trim() ?? null],
  );
  res.status(201).json(result.rows[0]);
});

// Update team
router.put("/:id", requireAdmin, async (req, res) => {
  let teamId;
  try {
    teamId = parseIntParam(req.params.id, "team id");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const { name, description } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: "Team name is required" });

  const result = await pool.query(
    "UPDATE teams SET name = $1, description = $2 WHERE id = $3 RETURNING *",
    [name.trim(), description?.trim() ?? null, teamId],
  );
  if (result.rowCount === 0)
    return res.status(404).json({ error: "Team not found" });
  res.json(result.rows[0]);
});

// Delete team — blocked if members exist
router.delete("/:id", requireAdmin, async (req, res) => {
  let teamId;
  try {
    teamId = parseIntParam(req.params.id, "team id");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const memberCount = await pool.query(
    "SELECT COUNT(*) AS cnt FROM team_members WHERE team_id = $1",
    [teamId],
  );
  if (parseInt(memberCount.rows[0].cnt) > 0)
    return res
      .status(409)
      .json({ error: "Remove all members before deleting" });

  const result = await pool.query("DELETE FROM teams WHERE id = $1", [teamId]);
  if (result.rowCount === 0)
    return res.status(404).json({ error: "Team not found" });
  res.json({ ok: true });
});

// Add member to team (optionally as lead)
router.post("/:id/members", requireAdmin, async (req, res) => {
  let teamId;
  try {
    teamId = parseIntParam(req.params.id, "team id");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const userId = Number(req.body.user_id);
  if (!Number.isInteger(userId) || userId <= 0)
    return res
      .status(400)
      .json({ error: "user_id must be a positive integer" });

  const { is_lead = false } = req.body;

  // Verify team exists
  const teamResult = await pool.query("SELECT id FROM teams WHERE id = $1", [
    teamId,
  ]);
  if (!teamResult.rows[0])
    return res.status(404).json({ error: "Team not found" });

  // Verify user exists and is not an admin
  const userResult = await pool.query(
    "SELECT id, role FROM users WHERE id = $1",
    [userId],
  );
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.role === "admin")
    return res.status(400).json({ error: "Admins cannot be team members" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert membership — UNIQUE(user_id) will throw 23505 if already in a team
    await client.query(
      "INSERT INTO team_members (team_id, user_id, is_lead) VALUES ($1, $2, $3)",
      [teamId, userId, is_lead],
    );

    // Promote role if is_lead
    if (is_lead) {
      await client.query("UPDATE users SET role = 'team_lead' WHERE id = $1", [
        userId,
      ]);
    }

    await client.query("COMMIT");
    res.status(201).json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "Worker already belongs to a team" });
    throw err;
  } finally {
    client.release();
  }
});

// Remove member from team
router.delete("/:id/members/:userId", requireAdmin, async (req, res) => {
  let teamId, userId;
  try {
    teamId = parseIntParam(req.params.id, "team id");
    userId = parseIntParam(req.params.userId, "user id");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING is_lead",
      [teamId, userId],
    );
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Member not found in this team" });
    }

    // Demote team_lead back to worker
    if (result.rows[0].is_lead) {
      await client.query(
        "UPDATE users SET role = 'worker' WHERE id = $1 AND role = 'team_lead'",
        [userId],
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

// Update lead status of a member
router.patch("/:id/members/:userId", requireAdmin, async (req, res) => {
  let teamId, userId;
  try {
    teamId = parseIntParam(req.params.id, "team id");
    userId = parseIntParam(req.params.userId, "user id");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const { is_lead } = req.body;
  if (typeof is_lead !== "boolean")
    return res.status(400).json({ error: "is_lead (boolean) is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      "UPDATE team_members SET is_lead = $1 WHERE team_id = $2 AND user_id = $3",
      [is_lead, teamId, userId],
    );
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Member not found in this team" });
    }

    // Sync user role
    if (is_lead) {
      await client.query("UPDATE users SET role = 'team_lead' WHERE id = $1", [
        userId,
      ]);
    } else {
      await client.query(
        "UPDATE users SET role = 'worker' WHERE id = $1 AND role = 'team_lead'",
        [userId],
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

module.exports = router;
