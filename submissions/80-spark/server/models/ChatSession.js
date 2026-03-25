const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  messages: [{
    role: { type: String, enum: ['user', 'bot', 'agent', 'system'] },
    content: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Update lastActive before save
chatSessionSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
