const express = require('express');
const rateLimit = require('express-rate-limit');
const { createJob, findJobs, getCaptcha, deleteCaptcha, getUserById, countJobsByPoster, updateJob, deleteJob } = require('../db');

const router = express.Router();

const jobRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 5),
  message: { message: 'Too many requests, please try again later' },
});

const categories = [
  'Delivery',
  'Cleaning',
  'Construction',
  'IT',
  'Labor',
  'Trade',
  'Gardening',
  'Moving',
  'Handyman',
  'Tutoring',
  'Healthcare',
  'Customer Service',
  'Design',
  'Marketing',
  'Administration',
  'Event Support',
  'Security',
  'Food Service',
  'Freelance',
  'Other',
];
const locationsByProvince = {
  Ontario: ['Toronto', 'Ottawa', 'Hamilton', 'Mississauga', 'Brampton', 'London', 'Kitchener', 'Windsor'],
  'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Richmond'],
  Alberta: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'],
  Saskatchewan: ['Saskatoon', 'Regina', 'Prince Albert'],
  Manitoba: ['Winnipeg', 'Brandon', 'Steinbach'],
  Quebec: ['Montreal', 'Quebec City', 'Laval', 'Gatineau'],
  'New Brunswick': ['Moncton', 'Saint John', 'Fredericton'],
  'Nova Scotia': ['Halifax', 'Sydney', 'Dartmouth'],
  'Prince Edward Island': ['Charlottetown', 'Summerside'],
  'Newfoundland and Labrador': ['St. John\'s', 'Corner Brook'],
  Yukon: ['Whitehorse', 'Dawson City'],
  'Northwest Territories': ['Yellowknife', 'Inuvik'],
  Nunavut: ['Iqaluit', 'Rankin Inlet'],
};

const provinces = Object.keys(locationsByProvince);

router.get('/', (req, res) => {
  console.log('[jobs GET] incoming query', req.query);
  const filters = {
    category: req.query.category,
    province: req.query.province,
    city: req.query.city,
    status: req.query.status,
  };

  if (req.query.mine === 'true') {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required for my postings' });
    }
    filters.posterId = req.user.id;
    filters.includeAll = true; // include pending/approved/rejected/expired for owner
  }

  const jobs = findJobs(filters);
  console.log(`[jobs GET] returning ${jobs.length} jobs`);
  res.json(jobs);
});

router.post('/', jobRateLimiter, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      province,
      city,
      contactEmail,
      contactPhone,
      anonymousName,
      captchaToken,
      captchaAnswer,
      isAnonymous = true,
    } = req.body;

    if (!title || !description || !category || !province || !city || !captchaToken || !captchaAnswer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (title.trim().length < 5) {
      return res.status(400).json({ message: 'Title must be at least 5 characters' });
    }

    if (description.trim().length < 20) {
      return res.status(400).json({ message: 'Description must be at least 20 characters' });
    }

    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) {
      return res.status(400).json({ message: 'Contact email is invalid' });
    }

    if (contactPhone && !/^\+?[0-9\-\s]{7,20}$/.test(contactPhone)) {
      return res.status(400).json({ message: 'Contact phone is invalid' });
    }

    if (!categories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const normalizeValue = (value) => String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\.\-\s']+/g, '');

    const normalizedProvinceKey = Object.keys(locationsByProvince).find((p) => normalizeValue(p) === normalizeValue(province));
    if (!normalizedProvinceKey) {
      return res.status(400).json({ message: 'Invalid province selection' });
    }

    if (!city || String(city).trim().length === 0) {
      return res.status(400).json({ message: 'City is required' });
    }

    const cityList = locationsByProvince[normalizedProvinceKey] || [];
    const matchedCity = cityList.find((c) => normalizeValue(c) === normalizeValue(city));

    const normalizedCity = matchedCity || String(city).trim();
    const normalizedProvince = normalizedProvinceKey;

    if (!req.user && !anonymousName) {
      return res.status(400).json({ message: 'Anonymous name is required for public post' });
    }

    if (anonymousName && anonymousName.trim().length < 2) {
      return res.status(400).json({ message: 'Anonymous name must be at least 2 characters' });
    }

    const captcha = getCaptcha(captchaToken);
    if (!captcha || Date.now() > captcha.expiresAt) {
      if (captcha) deleteCaptcha(captchaToken);
      return res.status(400).json({ message: 'Captcha expired or invalid' });
    }

    if (String(captcha.answer) !== String(captchaAnswer).trim()) {
      deleteCaptcha(captchaToken);
      return res.status(400).json({ message: 'Captcha answer is incorrect' });
    }

    deleteCaptcha(captchaToken);

    const posterId = req.user?.id || null;
    let user = null;

    if (posterId) {
      user = getUserById(posterId);
      if (user && user.role !== 'admin') {
        const existingJobs = countJobsByPoster(posterId);
        if (existingJobs >= 1 && !user.emailValidated) {
          return res.status(403).json({ message: 'Please verify your email before posting more jobs.' });
        }
      }
    }

    const job = createJob({
      title,
      description,
      category,
      province: normalizedProvince,
      city: normalizedCity,
      otherProvince: null,
      posterId,
      posterName: isAnonymous ? (anonymousName || null) : (req.user?.name || null),
      isAnonymous: !!isAnonymous,
      status: 'approved',
      contactEmail: contactEmail ? contactEmail.trim() : null,
      contactPhone: contactPhone ? contactPhone.trim() : null,
    });

    res.status(201).json(job);
  } catch (err) {
    console.error('jobs POST error', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication is required to edit jobs' });
  }

  const existingJob = findJobs({ includeAll: true, posterId: req.user.id }).find((job) => String(job.id) === String(id));
  if (!existingJob) {
    return res.status(404).json({ message: 'Job not found or not owned by user' });
  }

  const { title, description, category, province, city, contactEmail, contactPhone, status } = req.body;

  const updated = updateJob(id, { title, description, category, province, city, contactEmail, contactPhone, status });

  if (updated.changes === 0) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  const job = findJobs({ includeAll: true, posterId: req.user.id }).find((job) => String(job.id) === String(id));
  res.json(job);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication is required to delete jobs' });
  }

  const existingJob = findJobs({ includeAll: true, posterId: req.user.id }).find((job) => String(job.id) === String(id));
  if (!existingJob) {
    return res.status(404).json({ message: 'Job not found or not owned by user' });
  }

  deleteJob(id);
  res.json({ message: 'Job deleted' });
});

module.exports = router;
