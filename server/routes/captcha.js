const express = require('express');
const crypto = require('crypto');
const { saveCaptcha, getCaptcha, deleteCaptcha } = require('../db');

const router = express.Router();
const TTL = Number(process.env.CAPTCHA_TTL_SECONDS || 120);

router.get('/', (req, res) => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const question = `${a} + ${b}`;
  const answer = String(a + b);
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + TTL * 1000;

  saveCaptcha(token, answer, expiresAt);

  res.json({ token, question, expiresAt });
});

router.post('/verify', (req, res) => {
  const { token, answer } = req.body;
  if (!token || !answer) {
    return res.status(400).json({ message: 'Captcha token and answer required' });
  }

  const captcha = getCaptcha(token);
  if (!captcha || Date.now() > captcha.expiresAt) {
    if (captcha) deleteCaptcha(token);
    return res.status(400).json({ message: 'Captcha expired or invalid' });
  }

  deleteCaptcha(token);
  if (String(captcha.answer) !== String(answer).trim()) {
    return res.status(400).json({ message: 'Captcha answer is incorrect' });
  }

  res.json({ ok: true });
});

module.exports = router;
