const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

const router = express.Router();

// POST /api/agents/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find agent
    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: agent._id, name: agent.name, email: agent.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      agent: {
        id: agent._id,
        name: agent.name,
        email: agent.email
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
