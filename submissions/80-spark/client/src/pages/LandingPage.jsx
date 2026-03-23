import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  const handleStart = (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    sessionStorage.setItem('userName', name.trim())
    sessionStorage.setItem('userEmail', email.trim())
    navigate('/chat')
  }

  return (
    <PageShell>
      <nav className={styles.nav}>
        <span className={styles.navLogo}>
          <Logo size={22} />
          SmartDesk
        </span>
        <div className={styles.navRight}>
          <a href="/agent/login" className={styles.navLink}>Agent Sign In</a>
          <ThemeToggle />
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>AI-Powered Support</span>

          <h1 className={styles.heroTitle}>
            Support that<br /><span>actually helps.</span>
          </h1>

          <p className={styles.heroSub}>
            Get instant answers from our AI. Complex issues are escalated to a human agent automatically — no hold music, no waiting.
          </p>

          <div className={styles.card}>
            <p className={styles.cardTitle}>Get started</p>
            <p className={styles.cardSub}>Tell us who you are and we'll connect you.</p>

            <form onSubmit={handleStart} className={styles.form}>
              <div>
                <label className={styles.fieldLabel} htmlFor="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={styles.fieldLabel} htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={styles.submitBtn}>Start Chat</button>
            </form>

            <div className={styles.divider}>or</div>
            <p className={styles.agentLink}>
              Support agent? <a href="/agent/login">Sign in here</a>
            </p>
          </div>
        </div>
      </section>

      <div className={styles.features}>
        {[
          { icon: <BoltIcon />,    label: 'Instant AI responses' },
          { icon: <ShieldIcon />,  label: 'Security detection' },
          { icon: <TargetIcon />,  label: 'Smart escalation' },
          { icon: <ChartIcon />,   label: 'Live agent dashboard' },
        ].map((f) => (
          <div key={f.label} className={styles.feature}>
            <span className={styles.featureIcon}>{f.icon}</span>
            {f.label}
          </div>
        ))}
      </div>
    </PageShell>
  )
}

// Inline micro-icons — no emoji, no external lib
function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M8 1L3 8h4l-1 5 6-7H8L8 1z" stroke="#60a5fa" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L2 3.5v4c0 2.5 2.2 4.5 5 5 2.8-.5 5-2.5 5-5v-4L7 1.5z" stroke="#818cf8" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}
function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="#34d399" strokeWidth="1.4" fill="none"/>
      <circle cx="7" cy="7" r="2.5" stroke="#34d399" strokeWidth="1.4" fill="none"/>
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="7" width="2.5" height="5.5" rx="1" fill="#f472b6"/>
      <rect x="5.75" y="4" width="2.5" height="8.5" rx="1" fill="#f472b6"/>
      <rect x="10" y="1.5" width="2.5" height="11" rx="1" fill="#f472b6"/>
    </svg>
  )
}
