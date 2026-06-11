const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM doctors ORDER BY specialization');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctors.' });
  }
});

router.get('/:id/slots', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM time_slots
       WHERE doctor_id = ? AND slot_date >= CURDATE() AND is_booked = 0
       ORDER BY slot_date, slot_time`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch time slots.' });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { full_name, specialization, available_days, bio } = req.body;
  if (!full_name || !specialization || !available_days)
    return res.status(400).json({ error: 'Name, specialization, and available days are required.' });
  try {
    const [result] = await db.execute(
      'INSERT INTO doctors (full_name, specialization, available_days, bio) VALUES (?,?,?,?)',
      [full_name, specialization, available_days, bio || null]
    );
    res.status(201).json({ message: 'Doctor added.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add doctor.' });
  }
});

router.post('/:id/slots', authMiddleware, adminOnly, async (req, res) => {
  const { slot_date, slot_time } = req.body;
  if (!slot_date || !slot_time)
    return res.status(400).json({ error: 'Date and time are required.' });
  try {
    const [result] = await db.execute(
      'INSERT INTO time_slots (doctor_id, slot_date, slot_time) VALUES (?,?,?)',
      [req.params.id, slot_date, slot_time]
    );
    res.status(201).json({ message: 'Slot added.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add slot.' });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.execute('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    res.json({ message: 'Doctor removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete doctor.' });
  }
});

module.exports = router;