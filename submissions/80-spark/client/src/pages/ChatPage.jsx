import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import PageShell from '../components/PageShell'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import styles from './ChatPage.module.css'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const sevBadge = { Critical: 'badge-high', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' }

const EMOTION_MAP = {
  Calm: { emoji: '😌', label: 'Calm' },
  Frustrated: { emoji: '😤', label: 'Frustrated' },
  Angry: { emoji: '😡', label: 'Angry' },
  Desperate: { emoji: '😰', label: 'Desperate' },
  Threatening: { emoji: '🔴', label: 'Threatening' },
}

export default function ChatPage() {
  const navigate = useNavigate()
  const name = sessionStorage.getItem('userName')
  const email = sessionStorage.getItem('userEmail')

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [typing, setTyping] = useState(false)
  const [currentSeverity, setCurrentSeverity] = useState(null)
  const [currentCategory, setCurrentCategory] = useState(null)
  const [currentEmotion, setCurrentEmotion] = useState(null)
  const [sentimentScore, setSentimentScore] = useState(0.6)
  const [suggestions, setSuggestions] = useState([])
  const [ticket, setTicket] = useState(null)
  const [rating, setRating] = useState(null)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)
  const lastSentRef = useRef(0)

  useEffect(() => {
    if (!name || !email) { navigate('/'); return }

    const socket = io(SOCKET_URL)
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('user_join', { name, email })
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('welcome', (data) => {
      setMessages([{ role: 'bot', text: data.message, time: new Date() }])
      setSuggestions(['I have a billing issue', 'Technical problem', 'Account help'])
    })

    socket.on('bot_message', (data) => {
      setTyping(false)
      if (data.severity) setCurrentSeverity(data.severity)
      if (data.category) setCurrentCategory(data.category)
      if (data.emotion) setCurrentEmotion(data.emotion)
      if (data.sentimentScore !== undefined) setSentimentScore(data.sentimentScore)
      if (data.suggestedReplies?.length > 0) setSuggestions(data.suggestedReplies)
      else setSuggestions([])

      setMessages((prev) => [...prev, {
        role: 'bot', text: data.message,
        severity: data.severity, category: data.category, time: new Date(),
      }])
    })

    socket.on('ticket_created', (data) => {
      setTicket(data)
      setSuggestions([])
      setMessages((prev) => [...prev, { role: 'system', ticket: data, time: new Date() }])
    })

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = (text) => {
    const msg = (text || input).trim()
    if (!msg || !connected) return
    const now = Date.now()
    if (now - lastSentRef.current < 2000) return
    lastSentRef.current = now
    setMessages((prev) => [...prev, { role: 'user', text: msg, time: new Date() }])
    setInput('')
    setTyping(true)
    setSuggestions([])
    socketRef.current.emit('user_message', { message: msg })
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const escalate = () => {
    socketRef.current?.emit('user_message', { message: 'I want to talk to a human agent', forceEscalate: true })
  }

  const resetChat = () => { sessionStorage.clear(); navigate('/') }

  // Sentiment
  const sentimentPct = Math.round(sentimentScore * 100)
  const sentimentColor = sentimentScore > 0.6 ? '#34c759' : sentimentScore > 0.35 ? '#ff9500' : '#ff3b30'
  const emotionInfo = EMOTION_MAP[currentEmotion] || EMOTION_MAP.Calm

  return (
    <PageShell>
      <div className={styles.pageWrap}>
        <div className={styles.page}>

          {/* Nav */}
          <nav className={styles.nav}>
            <span className={styles.navLogo}>
              <Logo size={20} />
              SmartDesk
            </span>
            <div className={styles.navMeta}>
              {/* Sentiment meter */}
              {currentEmotion && (
                <div className={styles.sentimentMeter}>
                  <span className={styles.sentimentEmoji}>{emotionInfo.emoji}</span>
                  <div className={styles.sentimentTrack}>
                    <div className={styles.sentimentFill} style={{ width: `${sentimentPct}%`, background: sentimentColor }} />
                  </div>
                  <span className={styles.sentimentLabel}>{emotionInfo.label}</span>
                </div>
              )}
              {currentSeverity && <span className={`badge ${sevBadge[currentSeverity]}`}>{currentSeverity}</span>}
              {currentCategory && <span className={styles.categoryPill}>{currentCategory}</span>}
              <span className={`${styles.statusDot} ${connected ? styles.online : styles.offline}`}>
                {connected ? 'Live' : 'Reconnecting'}
              </span>
              <ThemeToggle />
            </div>
          </nav>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.map((msg, i) => {
              if (msg.role === 'system') return (
                <div key={i} className={styles.ticketCard}>
                  <div className={styles.ticketCardHeader}>
                    <TicketIcon />
                    <span className={styles.ticketCardTitle}>Ticket Created</span>
                  </div>
                  <div className={styles.ticketCardRow}>
                    <span className={styles.ticketCardLabel}>ID</span>
                    <span className={styles.ticketCardVal}>{msg.ticket.ticketId}</span>
                  </div>
                  <div className={styles.ticketCardRow}>
                    <span className={styles.ticketCardLabel}>Category</span>
                    <span className={styles.ticketCardVal}>{msg.ticket.category}</span>
                  </div>
                  <div className={styles.ticketCardRow}>
                    <span className={styles.ticketCardLabel}>Severity</span>
                    <span className={`badge ${sevBadge[msg.ticket.severity]}`}>{msg.ticket.severity}</span>
                  </div>
                  <div className={styles.ticketCardNote}>An agent will reach out to {email} shortly.</div>

                  {/* Satisfaction rating */}
                  {!rating && (
                    <div className={styles.ratingSection}>
                      <span className={styles.ratingLabel}>How was your experience?</span>
                      <div className={styles.ratingBtns}>
                        <button className={styles.ratingBtn} onClick={() => setRating('up')}>👍</button>
                        <button className={styles.ratingBtn} onClick={() => setRating('down')}>👎</button>
                      </div>
                    </div>
                  )}
                  {rating && (
                    <div className={styles.ratingDone}>
                      {rating === 'up' ? '👍' : '👎'} Thanks for your feedback!
                    </div>
                  )}
                </div>
              )

              return (
                <div key={i} className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.botBubble}`}>
                  {msg.text}
                  <div className={styles.bubbleMeta}>
                    {msg.severity && <span className={`badge ${sevBadge[msg.severity]}`}>{msg.severity}</span>}
                    {msg.category && msg.role === 'bot' && <span className={styles.categoryPill}>{msg.category}</span>}
                    <span className={styles.msgTime}>
                      {msg.time?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Quick reply suggestions */}
            {suggestions.length > 0 && !typing && !ticket && (
              <div className={styles.suggestionsRow}>
                {suggestions.map((s, i) => (
                  <button key={i} className={styles.suggestionPill} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {typing && (
              <div className={styles.typingBubble}>
                <div className={styles.typingDots}><span /><span /><span /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Action bar */}
          <div className={styles.actionBar}>
            <button className={styles.humanBtn} onClick={escalate} disabled={!!ticket}>
              Talk to Human
            </button>
            <button className={styles.newChatBtn} onClick={resetChat}>New Chat</button>
          </div>

          {/* Input */}
          <div className={styles.inputBar}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={ticket ? 'Chat ended — ticket created' : 'Message SmartDesk...'}
              disabled={!connected || !!ticket}
            />
            <button
              className={styles.sendBtn}
              onClick={() => send()}
              disabled={!connected || !input.trim() || !!ticket}
            >
              Send
            </button>
          </div>

        </div>
      </div>
    </PageShell>
  )
}

function TicketIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3" width="12" height="9" rx="2" stroke="#60a5fa" strokeWidth="1.4" fill="none" />
      <path d="M4 7h6M4 9.5h4" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
