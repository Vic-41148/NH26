const express = require('express');
const Ticket = require('../models/Ticket');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All ticket routes require authentication
router.use(authMiddleware);

// GET /api/tickets — List all tickets with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, severity, category, emotion, urgency } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (category) filter.category = category;
    if (emotion) filter.emotion = emotion;
    if (urgency) filter.urgency = urgency;

    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error('Get tickets error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/tickets/stats/overview — Aggregate stats for dashboard
router.get('/stats/overview', async (req, res) => {
  try {
    const [total, open, inProgress, resolved, highPriority, flagged] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'in-progress' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.countDocuments({ severity: { $in: ['High', 'Critical'] } }),
      Ticket.countDocuments({ securityFlag: true }),
    ]);

    res.json({ total, open, inProgress, resolved, highPriority, flagged });
  } catch (error) {
    console.error('Stats error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/tickets/suggestion/:id — AI-generated resolution suggestion
router.get('/suggestion/:id', async (req, res) => {
  let ticket;
  try {
    // Try both _id and ticketId
    ticket = await Ticket.findById(req.params.id).catch(() => null);
    if (!ticket) {
      ticket = await Ticket.findOne({ ticketId: req.params.id });
    }
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Build transcript summary for AI
    const transcriptText = ticket.transcript
      .map(t => `${t.role === 'user' ? 'Customer' : 'Bot'}: ${t.message || t.content || ''}`)
      .join('\n');

    const prompt = `You are a senior customer support agent. Based on the following support ticket, provide a suggested resolution.

Ticket Details:
- Category: ${ticket.category}
- Severity: ${ticket.severity}
- Customer Emotion: ${ticket.emotion}
- Urgency: ${ticket.urgency}
- Summary: ${ticket.summary}
- Security Flagged: ${ticket.securityFlag ? 'YES' : 'No'}

Chat Transcript:
${transcriptText}

Provide your response as JSON ONLY (no markdown, no code fences):
{
  "suggestedResolution": "step-by-step resolution for the agent to follow",
  "estimatedTime": "estimated time to resolve",
  "priority": "how urgently this should be handled",
  "tips": "any tips for the agent handling this case"
}`;

    // Try Groq first, then Gemini
    let responseText;

    if (process.env.GROQ_API_KEY) {
      try {
        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 512,
        });
        responseText = completion.choices[0].message.content;
      } catch (e) {
        console.warn('Groq suggestion failed:', e.message);
      }
    }

    if (!responseText && process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        responseText = result.response.text().trim();
      } catch (e) {
        console.warn('Gemini suggestion failed:', e.message);
      }
    }

    if (!responseText) {
      return res.json({
        suggestedResolution: 'Review the chat transcript and resolve based on your expertise.',
        estimatedTime: 'Unknown',
        priority: ticket.severity || 'Medium',
        tips: 'Check the chat transcript for key customer pain points.'
      });
    }

    // Clean markdown fences if present
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
    }

    const suggestion = JSON.parse(responseText);
    res.json(suggestion);
  } catch (error) {
    console.error('Suggestion error:', error.message);
    res.json({
      suggestedResolution: 'Unable to generate AI suggestion. Please review the ticket transcript.',
      estimatedTime: 'Unknown',
      priority: ticket?.severity || 'Medium',
      tips: 'Check the chat transcript for key customer pain points.'
    });
  }
});

// GET /api/tickets/:id — Single ticket with full transcript
router.get('/:id', async (req, res) => {
  try {
    // Try both _id and ticketId
    let ticket = await Ticket.findById(req.params.id).catch(() => null);
    if (!ticket) {
      ticket = await Ticket.findOne({ ticketId: req.params.id });
    }
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    res.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/tickets/:id — Update ticket (status, assignedAgent, resolutionNotes)
router.put('/:id', async (req, res) => {
  try {
    const { status, assignedAgent, resolutionNotes } = req.body;
    const updateFields = {};

    if (status) {
      const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Use: open, in-progress, resolved, or closed.' });
      }
      updateFields.status = status;
    }
    if (assignedAgent) updateFields.assignedAgent = assignedAgent;
    if (resolutionNotes !== undefined) updateFields.resolutionNotes = resolutionNotes;

    // Try both _id and ticketId
    let ticket = await Ticket.findByIdAndUpdate(req.params.id, updateFields, { new: true }).catch(() => null);
    if (!ticket) {
      ticket = await Ticket.findOneAndUpdate({ ticketId: req.params.id }, updateFields, { new: true });
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Broadcast update to agents dashboard in real-time
    const io = req.app.get('io');
    if (io) {
      io.to('agents').emit('ticket_updated', {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        assignedAgent: ticket.assignedAgent,
        resolutionNotes: ticket.resolutionNotes,
        severity: ticket.severity,
        emotion: ticket.emotion,
        urgency: ticket.urgency
      });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Update ticket error:', error.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
