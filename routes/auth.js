const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { full_name, email, admission_no, phone, password } = req.body;
  if (!full_name || !email || !admission_no || !password)
    return res.status(400).json({ error: 'All required fields must be filled.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO students (full_name, email, admission_no, phone, password) VALUES (?,?,?,?,?)',
      [full_name, email, admission_no, phone || null, hashed]
    );
    res.status(201).json({ message: 'Registration successful.', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email or Admission Number already registered.' });
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });
  try {
    const [rows] = await db.execute('SELECT * FROM students WHERE email = ?', [email]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid email or password.' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign(
      { id: user.id, name: user.full_name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, name: user.full_name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;