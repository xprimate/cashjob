const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, 'cashjob.db'));

// Setup tables
const init = () => {
  db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      province TEXT NOT NULL,
      city TEXT,
      otherProvince TEXT,
      posterId INTEGER,
      posterName TEXT,
      isAnonymous INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'approved',
      contactEmail TEXT,
      contactPhone TEXT,
      createdAt TEXT NOT NULL,
      expiresAt TEXT,
      FOREIGN KEY(posterId) REFERENCES users(id)
  )`).run();

  const columns = db.prepare('PRAGMA table_info(jobs)').all().map((c) => c.name);
  const addIfMissing = (columnSql) => {
    const columnName = columnSql.match(/ADD COLUMN (\w+)/i)[1];
    if (!columns.includes(columnName)) {
      db.prepare(columnSql).run();
    }
  };

  addIfMissing('ALTER TABLE jobs ADD COLUMN expiresAt TEXT');
  addIfMissing('ALTER TABLE jobs ADD COLUMN contactEmail TEXT');
  addIfMissing('ALTER TABLE jobs ADD COLUMN contactPhone TEXT');
  addIfMissing('ALTER TABLE jobs ADD COLUMN posterName TEXT');

  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const addIfMissingUser = (columnSql) => {
    const columnName = columnSql.match(/ADD COLUMN (\w+)/i)[1];
    if (!userColumns.includes(columnName)) {
      db.prepare(columnSql).run();
    }
  };

  addIfMissingUser('ALTER TABLE users ADD COLUMN emailValidated INTEGER NOT NULL DEFAULT 0');
  addIfMissingUser('ALTER TABLE users ADD COLUMN verificationToken TEXT');

  db.prepare(`CREATE TABLE IF NOT EXISTS captchas (
      token TEXT PRIMARY KEY,
      answer TEXT NOT NULL,
      expiresAt INTEGER NOT NULL
  )`).run();
};

const getUserByEmail = (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email);
const getUserById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const createUser = (name, email, passwordHash, role = 'user') => {
  const stmt = db.prepare('INSERT INTO users (name, email, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(name, email, passwordHash, role, new Date().toISOString());
  return getUserById(result.lastInsertRowid);
};

const createJob = (job) => {
  const status = job.status || 'pending';
  const stmt = db.prepare(`INSERT INTO jobs (title, description, category, province, city, otherProvince, posterId, posterName, isAnonymous, status, contactEmail, contactPhone, createdAt, expiresAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const expiresAtValue = job.expiresAt ? job.expiresAt : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const result = stmt.run(
    job.title,
    job.description,
    job.category,
    job.province,
    job.city || null,
    job.otherProvince || null,
    job.posterId || null,
    job.posterName || null,
    job.isAnonymous ? 1 : 0,
    status,
    job.contactEmail || null,
    job.contactPhone || null,
    new Date().toISOString(),
    expiresAtValue
  );
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
};

const autoExpireJobs = () => {
  const now = new Date().toISOString();
  db.prepare("UPDATE jobs SET status = 'expired' WHERE expiresAt IS NOT NULL AND expiresAt <= ? AND status IN ('pending','approved')").run(now);
};

const findJobs = (filters = {}) => {
  console.log('[findJobs] filters', filters);
  autoExpireJobs();

  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];

  if (filters.includeAll) {
    // no status filter
  } else if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  } else {
    sql += ' AND status = ?';
    params.push('approved');
  }

  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.province) {
    sql += ' AND province = ?';
    params.push(filters.province);
  }

  if (filters.city) {
    sql += ' AND city = ?';
    params.push(filters.city);
  }

  if (filters.posterId) {
    sql += ' AND posterId = ?';
    params.push(filters.posterId);
  }

  sql += ' ORDER BY createdAt DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  return db.prepare(sql).all(...params);
};

const countJobsByStatus = () => {
  autoExpireJobs();
  return db.prepare('SELECT status, COUNT(*) as count FROM jobs GROUP BY status').all();
};

const countJobs = (filters = {}) => {
  autoExpireJobs();
  let sql = 'SELECT COUNT(*) as total FROM jobs WHERE 1=1';
  const params = [];

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }

  return db.prepare(sql).get(...params).total;
};

const countJobsByCategory = () => {
  autoExpireJobs();
  return db.prepare('SELECT category, COUNT(*) as count FROM jobs GROUP BY category').all();
};

const countJobsByPoster = (posterId) => {
  return db.prepare('SELECT COUNT(*) as total FROM jobs WHERE posterId = ?').get(posterId).total;
};

const updateJob = (id, fields) => {
  const columns = [];
  const values = [];

  if (fields.title) {
    columns.push('title = ?');
    values.push(fields.title);
  }
  if (fields.description) {
    columns.push('description = ?');
    values.push(fields.description);
  }
  if (fields.category) {
    columns.push('category = ?');
    values.push(fields.category);
  }
  if (fields.province) {
    columns.push('province = ?');
    values.push(fields.province);
  }
  if (fields.city) {
    columns.push('city = ?');
    values.push(fields.city);
  }
  if (fields.contactEmail !== undefined) {
    columns.push('contactEmail = ?');
    values.push(fields.contactEmail);
  }
  if (fields.contactPhone !== undefined) {
    columns.push('contactPhone = ?');
    values.push(fields.contactPhone);
  }
  if (fields.status) {
    columns.push('status = ?');
    values.push(fields.status);
  }

  if (columns.length === 0) {
    return null;
  }

  const stmt = db.prepare(`UPDATE jobs SET ${columns.join(', ')} WHERE id = ?`);
  values.push(id);
  const result = stmt.run(...values);
  return result;
};

const setUserVerificationToken = (id, token) => {
  return db.prepare('UPDATE users SET verificationToken = ?, emailValidated = 0 WHERE id = ?').run(token, id);
};

const validateUserEmail = (token) => {
  const user = db.prepare('SELECT * FROM users WHERE verificationToken = ?').get(token);
  if (!user) return null;
  db.prepare('UPDATE users SET emailValidated = 1, verificationToken = NULL WHERE id = ?').run(user.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
};

const getUserByVerificationToken = (token) => {
  return db.prepare('SELECT * FROM users WHERE verificationToken = ?').get(token);
};

const deleteJob = (id) => {
  const stmt = db.prepare('DELETE FROM jobs WHERE id = ?');
  return stmt.run(id);
};

const deleteAllJobs = () => {
  return db.prepare('DELETE FROM jobs').run();
};

const deleteUser = (id) => {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
};

const getAllUsers = () => {
  return db.prepare('SELECT id, name, email, role, emailValidated, createdAt FROM users ORDER BY createdAt DESC').all();
};

const updateUserPassword = (id, passwordHash) => {
  return db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, id);
};
const saveCaptcha = (token, answer, expiresAt) => db.prepare('INSERT OR REPLACE INTO captchas (token, answer, expiresAt) VALUES (?, ?, ?)').run(token, answer, expiresAt);
const getCaptcha = (token) => db.prepare('SELECT * FROM captchas WHERE token = ?').get(token);
const deleteCaptcha = (token) => db.prepare('DELETE FROM captchas WHERE token = ?').run(token);
const getAllJobs = () => db.prepare('SELECT * FROM jobs').all();

module.exports = {
  init,
  getUserByEmail,
  getUserById,
  createUser,
  createJob,
  findJobs,
  countJobs,
  countJobsByStatus,
  countJobsByCategory,
  countJobsByPoster,
  updateJob,
  setUserVerificationToken,
  validateUserEmail,
  getUserByVerificationToken,
  deleteJob,
  deleteAllJobs,
  deleteUser,
  getAllUsers,
  updateUserPassword,
  getAllJobs,
  saveCaptcha,
  getCaptcha,
  deleteCaptcha,
  getDb: () => db,
};
