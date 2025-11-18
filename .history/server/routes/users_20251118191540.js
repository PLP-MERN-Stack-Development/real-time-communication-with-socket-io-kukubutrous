const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users -> all persisted users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ username: 1 }).lean().exec();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
