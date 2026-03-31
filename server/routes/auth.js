const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, getUserById, createUser, setUserVerificationToken, validateUserEmail } = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existing = getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: 'Email is already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = email.toLowerCase() === 'admin@cashjob.local' ? 'admin' : 'user';
  const user = createUser(name, email, passwordHash, role);

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, emailValidated: user.emailValidated } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = getUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, emailValidated: user.emailValidated } });
});

router.post('/send-verification', (req, res) => {
  const userId = (req.body || {}).userId || req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = getUserById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const token = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  setUserVerificationToken(user.id, token);

  // In a real app, send this as email link. For demo, we return token.
  res.json({ message: 'Verification token generated', token });
});

router.post('/verify-email', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }

  const user = validateUserEmail(token);
  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  res.json({ message: 'Email verified successfully', user: { id: user.id, name: user.name, email: user.email, emailValidated: user.emailValidated } });
});

module.exports = router;
