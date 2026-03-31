const express = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../db');

const router = express.Router();

// Note: mailer uses console log by default. Replace with SMTP config in production.
const transporter = nodemailer.createTransport({
  streamTransport: true,
  newline: 'unix',
  buffer: true,
});

const sendApprovalEmail = async (email, job, status) => {
  if (!email) return;

  const subject = `CashJob posting ${status}`;
  const text = `Your job post "${job.title}" was ${status}.\nDescription: ${job.description}\nStatus: ${status}`;

  const message = {
    from: 'no-reply@cashjob.local',
    to: email,
    subject,
    text,
  };

  const info = await transporter.sendMail(message);
  console.log('Mock email sent:', info.message.toString());
};


const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin required' });
  }
  next();
};

router.use(requireAdmin);

router.get('/jobs', (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const statusParam = req.query.status || 'pending';
  const category = req.query.category;

  const offset = (page - 1) * limit;
  const includeAll = statusParam === 'all';
  const status = includeAll ? undefined : statusParam;

  const jobs = db.findJobs({ includeAll, status, category, limit, offset });

  const countFilter = {};
  if (!includeAll) countFilter.status = status;
  if (category) countFilter.category = category;
  const total = db.countJobs(countFilter);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({ page, totalPages, total, jobs });
});

router.get('/stats', (req, res) => {
  const statuses = db.countJobsByStatus();
  const total = statuses.reduce((sum, item) => sum + item.count, 0);
  const categories = db.countJobsByCategory();
  res.json({ total, statuses, categories });
});

router.get('/users', (req, res) => {
  const users = db.getAllUsers();
  res.json({ users });
});

router.get('/jobs/csv', (req, res) => {
  const jobs = db.getAllJobs();
  const header = 'id,title,description,category,province,city,otherProvince,status,createdAt\n';
  const rows = jobs.map((j) => `"${j.id}","${j.title.replace(/"/g, '""')}","${j.description.replace(/"/g, '""')}","${j.category}","${j.province}","${j.city || ''}","${j.otherProvince || ''}","${j.status}","${j.createdAt}"`).join('\n');
  res.header('Content-Type', 'text/csv');
  res.header('Content-Disposition', 'attachment; filename="jobs.csv"');
  res.send(header + rows);
});

router.put('/jobs/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const update = db.getDb().prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, id);
  if (update.changes === 0) {
    return res.status(404).json({ message: 'Job not found' });
  }

  const updatedJob = db.getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id);

  if (updatedJob.posterId) {
    const user = db.getUserById(updatedJob.posterId);
    if (user) {
      await sendApprovalEmail(user.email, updatedJob, status);
    }
  }

  res.json(updatedJob);
});

router.delete('/jobs/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.deleteJob(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'Job not found' });
  }
  res.json({ message: 'Job deleted' });
});

router.delete('/jobs', (req, res) => {
  db.deleteAllJobs();
  res.json({ message: 'All jobs deleted' });
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.deleteUser(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ message: 'User deleted' });
});

router.put('/users/:id/password', async (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'New password is required (min 8 chars)' });
  }
  const hash = await bcrypt.hash(password, 10);
  const result = db.updateUserPassword(id, hash);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ message: 'Password updated' });
});

module.exports = router;
