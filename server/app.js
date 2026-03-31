require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { init } = require('./db');
const { authenticate } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const captchaRoutes = require('./routes/captcha');
const jobsRoutes = require('./routes/jobs');
const adminRoutes = require('./routes/admin');

const app = express();
init();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(authenticate);

app.use('/api/auth', authRoutes);
app.use('/api/captcha', captchaRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/status', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
