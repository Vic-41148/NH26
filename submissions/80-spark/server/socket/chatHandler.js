const { processMessage } = require('../services/aiEngine');
const { matchFAQ } = require('../services/faqMatcher');
const { classifyFallback } = require('../services/fallback');
const Ticket = require('../models/Ticket');

// Store active chat sessions: socketId -> { name, email, history[], messageCount }
const sessions = new Map();

// Rate limiting: track last message time per socket
const rateLimits = new Map();
const RATE_LIMIT_MS = 2000; // 1 message per 2 seconds

module.exports = function chatHandler(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── User joins chat ───
    socket.on('user_join', (data) => {
      const { name, email } = data;
      sessions.set(socket.id, {
        name: name || 'Anonymous',
        email: email || 'no-email',
        history: [],
        messageCount: 0
      });
      console.log(`👤 User joined: ${name} (${email})`);

      // Send welcome message (Adi's frontend listens for 'welcome')
      socket.emit('welcome', {
        message: `Hi ${name}! 👋 I'm the SmartDesk AI assistant. How can I help you today?`
      });
    });

    // ─── Agent joins dashboard room ───
    socket.on('agent_join', () => {
      socket.join('agents');
      console.log(`🛡️ Agent connected to dashboard: ${socket.id}`);
    });

    // ─── User sends a message ───
    // Listen on both 'user_message' (Adi's frontend) and 'send_message' (legacy)
    const handleUserMessage = async (data) => {
      const session = sessions.get(socket.id);
      if (!session) {
        socket.emit('error_message', { error: 'Session not found. Please reconnect.' });
        return;
      }

      const message = data.message || data.text || '';
      const forceEscalate = data.forceEscalate || false;
      if (!message || message.trim() === '') return;

      // ─── Rate Limiting ───
      const now = Date.now();
      const lastMsg = rateLimits.get(socket.id) || 0;
      if (now - lastMsg < RATE_LIMIT_MS) {
        socket.emit('error_message', { error: 'Please wait a moment before sending another message.' });
        return;
      }
      rateLimits.set(socket.id, now);

      session.messageCount++;

      // Add user message to history
      session.history.push({
        role: 'user',
        message: message.trim(),
        content: message.trim(), // Adi's frontend uses 'content'
        timestamp: new Date()
      });

      try {
        // ─── STEP 1: Check FAQ first (instant resolution) ───
        const faqMatch = matchFAQ(message.trim());

        let aiResult;

        if (faqMatch && session.messageCount <= 2) {
          // FAQ matched! Instant response without calling AI
          console.log(`📚 FAQ matched: ${faqMatch.summary}`);
          aiResult = {
            response: faqMatch.answer,
            category: faqMatch.category,
            severity: 'Low',
            emotion: 'Calm',
            urgency: 'Low',
            resolved: !faqMatch.forceEscalate,
            securityFlag: false,
            summary: faqMatch.summary,
            faqMatched: true,
            suggestedReplies: ['Thanks, that helped!', 'I still need help', 'Talk to a human'],
            sentimentScore: 0.6
          };

          // If FAQ says force escalate (e.g., "talk to human")
          if (faqMatch.forceEscalate) {
            aiResult.resolved = false;
            aiResult.severity = 'Medium';
          }
        } else {
          // ─── STEP 2: No FAQ match → full AI processing ───
          try {
            aiResult = await processMessage(message.trim(), session.history);
          } catch (aiError) {
            console.warn('⚠️ AI processing failed, using keyword fallback:', aiError.message);
            aiResult = classifyFallback(message.trim());
            aiResult.suggestedReplies = aiResult.suggestedReplies || ['Tell me more', 'I need help', 'Talk to a human'];
            aiResult.sentimentScore = aiResult.sentimentScore || 0.5;
          }
        }

        // Add bot response to history
        session.history.push({
          role: 'bot',
          message: aiResult.response,
          content: aiResult.response,
          timestamp: new Date()
        });

        // Send AI response to user
        socket.emit('bot_message', {
          message: aiResult.response,
          category: aiResult.category,
          severity: aiResult.severity,
          emotion: aiResult.emotion,
          urgency: aiResult.urgency,
          securityFlag: aiResult.securityFlag,
          resolved: aiResult.resolved,
          summary: aiResult.summary,
          suggestedReplies: aiResult.suggestedReplies || [],
          sentimentScore: aiResult.sentimentScore ?? 0.5
        });

        // ─── Escalation Logic ───
        const shouldEscalate =
          forceEscalate ||
          (!aiResult.resolved && (
            session.messageCount >= 3 ||
            aiResult.severity === 'High' ||
            aiResult.severity === 'Critical' ||
            aiResult.securityFlag
          ));

        if (shouldEscalate) {
          // If forceEscalate but AI gave resolved:true, override
          if (forceEscalate) {
            aiResult.resolved = false;
            if (aiResult.severity === 'Low') aiResult.severity = 'Medium';
          }

          const ticket = await Ticket.create({
            userName: session.name,
            userEmail: session.email,
            category: aiResult.category,
            severity: aiResult.severity,
            emotion: aiResult.emotion,
            urgency: aiResult.urgency,
            summary: aiResult.summary || `User requested human assistance`,
            transcript: session.history,
            securityFlag: aiResult.securityFlag
          });

          console.log(`🎫 Ticket created: ${ticket.ticketId} [${aiResult.severity}] ${aiResult.category}`);

          const ticketData = {
            ticketId: ticket.ticketId,
            _id: ticket._id,
            userName: ticket.userName,
            userEmail: ticket.userEmail,
            category: ticket.category,
            severity: ticket.severity,
            emotion: ticket.emotion,
            urgency: ticket.urgency,
            summary: ticket.summary,
            status: ticket.status,
            securityFlag: ticket.securityFlag,
            createdAt: ticket.createdAt,
            transcript: session.history
          };

          socket.emit('ticket_created', ticketData);
          io.to('agents').emit('new_ticket', ticketData);

          session.history = [];
          session.messageCount = 0;
        }
      } catch (error) {
        console.error('❌ Chat error:', error.message);
        // Last resort: if forceEscalate, still create a ticket
        if (forceEscalate) {
          try {
            const ticket = await Ticket.create({
              userName: session.name,
              userEmail: session.email,
              category: 'General',
              severity: 'Medium',
              emotion: 'Frustrated',
              urgency: 'High',
              summary: 'User requested human agent (system error during processing)',
              transcript: session.history,
              securityFlag: false
            });
            const ticketData = {
              ticketId: ticket.ticketId, _id: ticket._id,
              userName: ticket.userName, userEmail: ticket.userEmail,
              category: 'General', severity: 'Medium',
              summary: ticket.summary, status: ticket.status,
              securityFlag: false, createdAt: ticket.createdAt,
              transcript: session.history
            };
            socket.emit('ticket_created', ticketData);
            io.to('agents').emit('new_ticket', ticketData);
            session.history = []; session.messageCount = 0;
            return;
          } catch (ticketErr) {
            console.error('❌ Emergency ticket creation failed:', ticketErr.message);
          }
        }
        socket.emit('bot_message', {
          message: "I'm having trouble right now. Please try again in a moment.",
          category: 'General',
          severity: 'Low',
          suggestedReplies: ['Try again', 'Talk to a human'],
          sentimentScore: 0.5
        });
      }
    };

    socket.on('user_message', handleUserMessage);
    socket.on('send_message', handleUserMessage); // legacy compat

    // ─── Disconnect ───
    socket.on('disconnect', () => {
      sessions.delete(socket.id);
      rateLimits.delete(socket.id);
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};
