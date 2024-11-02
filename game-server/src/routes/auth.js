const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user: ' + error });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ _id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    
    // Set the token as an HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, 
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Set the abuse_interstitial cookie
    res.cookie('abuse_interstitial', 'baboon-neutral-mutt.ngrok-free.app', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({ user: {userId: user._id, username: user.username, token }});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.get('/check', verifyToken, (req, res) => {
  res.json({ user: { userId: req.user._id, username: req.user.username } });
});

module.exports = router;