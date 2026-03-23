import { useState } from 'react'
import { format } from 'date-fns'
import styles from './TicketModal.module.css'

const sevBadge = { Critical: 'badge-high', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' }
const statBadge = { open: 'badge-open', 'in-progress': 'badge-in-progress', resolved: 'badge-resolved', closed: 'badge-closed' }

const STATUS_FLOW = [
  { value: 'open', label: 'Open', icon: '📥' },
  { value: 'in-progress', label: 'In Progress', icon: '🔧' },
  { value: 'resolved', label: 'Resolved', icon: '✅' },
]

export default function TicketModal({ ticket, onClose, onUpdate }) {
  const [status, setStatus] = useState(ticket.status)
  const [notes, setNotes] = useState(ticket.resolutionNotes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(ticket._id, { status, resolutionNotes: notes })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdrop} role="dialog" aria-modal="true" aria-label="Ticket details">
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.ticketId}>{ticket.ticketId}</span>
            <div className={styles.badges}>
              <span className={`badge ${sevBadge[ticket.severity]}`}>{ticket.severity}</span>
              <span className={`badge ${statBadge[status]}`}>{status}</span>
              {ticket.securityFlag && <span className="badge badge-high">⚠ Security</span>}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Info cells */}
          <div className={styles.infoGrid}>
            {[
              { label: 'Category', val: ticket.category },
              { label: 'User', val: ticket.userName },
              { label: 'Email', val: ticket.userEmail },
              { label: 'Assigned', val: ticket.assignedAgent || '—' },
              { label: 'Created', val: ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, yyyy · HH:mm') : '—' },
              ...(ticket.emotion ? [{ label: 'Emotion', val: ticket.emotion }] : []),
            ].map((c) => (
              <div key={c.label} className={styles.infoCell}>
                <span className={styles.cellLabel}>{c.label}</span>
                <span className={styles.cellVal}>{c.val}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          {ticket.summary && (
            <div>
              <div className={styles.sectionTitle}>AI Summary</div>
              <p className={styles.summary}>{ticket.summary}</p>
            </div>
          )}

          {/* Transcript */}
          <div>
            <div className={styles.sectionTitle}>Chat Transcript</div>
            <div className={styles.transcript}>
              {ticket.transcript?.length > 0 ? (
                ticket.transcript.map((msg, i) => (
                  <div key={i} className={`${styles.msg} ${msg.role === 'user' ? styles.userMsg : styles.botMsg}`}>
                    <span className={styles.msgRole}>{msg.role === 'user' ? (ticket.userName || 'User') : '⚡ SmartDesk AI'}</span>
                    <span className={styles.msgText}>{msg.content || msg.text || msg.message}</span>
                    {msg.timestamp && (
                      <span className={styles.msgTime}>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                    )}
                  </div>
                ))
              ) : (
                <p className={styles.noTranscript}>No transcript available.</p>
              )}
            </div>
          </div>

          {/* Status workflow */}
          <div>
            <div className={styles.sectionTitle}>Update Status</div>
            <div className={styles.statusFlow}>
              {STATUS_FLOW.map((s, i) => (
                <button
                  key={s.value}
                  className={`${styles.statusStep} ${status === s.value ? styles.statusActive : ''} ${STATUS_FLOW.findIndex(f => f.value === status) > i ? styles.statusDone : ''}`}
                  onClick={() => setStatus(s.value)}
                >
                  <span className={styles.stepIcon}>{s.icon}</span>
                  <span className={styles.stepLabel}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className={styles.sectionTitle}>Resolution Notes</div>
            <textarea
              className={styles.notesArea}
              rows={3}
              placeholder="Add resolution notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Save */}
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : saved ? '✓ Saved' : 'Save Changes'}
          </button>

        </div>
      </div>
    </div>
  )
}
