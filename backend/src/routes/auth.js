const express = require('express');
const { pool } = require('../db');
const { hashPassword, verifyPassword } = require('../auth');
const router = express.Router();

// Check if initial setup is needed (no users exist yet)
router.get('/needs-setup', async (req, res) => {
  const result = await pool.query('SELECT COUNT(*) AS cnt FROM users');
  res.json({ needsSetup: parseInt(result.rows[0].cnt) === 0 });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// First-time setup — create admin (only works when no users exist)
router.post('/setup', async (req, res) => {
  const count = await pool.query('SELECT COUNT(*) AS cnt FROM users');
  if (parseInt(count.rows[0].cnt) > 0) return res.status(403).json({ error: 'Setup already completed' });

  const { email, name, password } = req.body;
  if (!email || !name || !password) return res.status(400).json({ error: 'email, name, and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const hash = await hashPassword(password);
  const result = await pool.query(
    "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id, email, name, role",
    [email.toLowerCase().trim(), name, hash]
  );

  const user = result.rows[0];
  req.session.userId = user.id;
  res.status(201).json(user);
});

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.session.userId]);
  if (!result.rows[0]) return res.status(401).json({ error: 'Not authenticated' });
  res.json(result.rows[0]);
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
