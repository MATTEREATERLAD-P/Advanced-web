const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.*, d.full_name AS doctor_name, d.specialization,
              t.slot_date, t.slot_time
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN time_slots t ON a.slot_id = t.id
       WHERE a.student_id = ?
       ORDER BY t.slot_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

router.get('/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.*, s.full_name AS student_name, s.admission_no,
              d.full_name AS doctor_name, d.specialization,
              t.slot_date, t.slot_time
       FROM appointments a
       JOIN students s ON a.student_id = s.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN time_slots t ON a.slot_id = t.id
       ORDER BY t.slot_date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments.' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { doctor_id, slot_id, reason } = req.body;
  if (!doctor_id || !slot_id || !reason)
    return res.status(400).json({ error: 'Doctor, slot, and reason are required.' });
  const conn = await (require('../config/db')).getConnection();
  try {
    await conn.beginTransaction();
    const [slots] = await conn.execute(
      'SELECT * FROM time_slots WHERE id = ? AND is_booked = 0 FOR UPDATE',
      [slot_id]
    );
    if (slots.length === 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'This slot is already booked. Please choose another.' });
    }
    const [apptResult] = await conn.execute(
      'INSERT INTO appointments (student_id, doctor_id, slot_id, reason) VALUES (?,?,?,?)',
      [req.user.id, doctor_id, slot_id, reason]
    );
    await conn.execute('UPDATE time_slots SET is_booked = 1 WHERE id = ?', [slot_id]);
    await conn.commit();
    res.status(201).json({ message: 'Appointment booked successfully.', id: apptResult.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Booking failed. Please try again.' });
  } finally {
    conn.release();
  }
});

router.patch('/:id/status', authMiddleware, adminOnly, async (req, res) => {
  const { status, notes } = req.body;
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status))
    return res.status(400).json({ error: 'Invalid status value.' });
  try {
    await db.execute(
      'UPDATE appointments SET status = ?, notes = ? WHERE id = ?',
      [status, notes || null, req.params.id]
    );
    if (status === 'cancelled') {
      const [rows] = await db.execute('SELECT slot_id FROM appointments WHERE id = ?', [req.params.id]);
      if (rows.length > 0)
        await db.execute('UPDATE time_slots SET is_booked = 0 WHERE id = ?', [rows[0].slot_id]);
    }
    res.json({ message: `Appointment marked as ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM appointments WHERE id = ? AND student_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Appointment not found or not yours.' });
    if (rows[0].status === 'completed')
      return res.status(400).json({ error: 'Cannot cancel a completed appointment.' });
    await db.execute('UPDATE time_slots SET is_booked = 0 WHERE id = ?', [rows[0].slot_id]);
    await db.execute('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Appointment cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel appointment.' });
  }
});

router.post('/:id/prescriptions', authMiddleware, adminOnly, async (req, res) => {
  const { medication, dosage, duration } = req.body;
  if (!medication || !dosage || !duration)
    return res.status(400).json({ error: 'Medication, dosage, and duration are required.' });
  try {
    const [result] = await db.execute(
      'INSERT INTO prescriptions (appointment_id, medication, dosage, duration) VALUES (?,?,?,?)',
      [req.params.id, medication, dosage, duration]
    );
    res.status(201).json({ message: 'Prescription added.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add prescription.' });
  }
});

router.get('/:id/prescriptions', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM prescriptions WHERE appointment_id = ?',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prescriptions.' });
  }
});

module.exports = router;