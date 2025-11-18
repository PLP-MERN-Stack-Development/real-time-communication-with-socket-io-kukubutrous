const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// NOTE: For production, use bcrypt to hash passwords. This demo stores plain text for clarity.

async function registerUser(req, res) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'username & password required' });

  const existing = await User.findOne({ username }).exec();
  if (existing) return res.status(409).json({ message: 'user already exists' });

  const user = new User({ username, password });
  await user.save();

  const token = jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, username: user.username } });
}

async function loginUser(req, res) {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'username & password required' });

  const user = await User.findOne({ username }).exec();
  if (!user || user.password !== password) return res.status(401).json({ message: 'invalid credentials' });

  const token = jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, username: user.username } });
}

async function verifyToken(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ valid: false });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: payload });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
}

module.exports = { registerUser, loginUser, verifyToken };
