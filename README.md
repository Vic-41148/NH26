<div align="center">

# ⚡ SmartDesk — AI-Powered Complaint Management System

### National Hackathon 2026 · Problem Statement P4 · Team Spark #80

An end-to-end support portal that uses **AI chatbot deflection**, **automated ticket routing**, and a **real-time agent dashboard** to reduce manual ticket sorting and improve resolution time.

[![Tech Stack](https://img.shields.io/badge/Stack-MERN-00d9ff?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![AI](https://img.shields.io/badge/AI-LLM_API-ff6b6b?style=for-the-badge&logo=openai&logoColor=white)](https://console.groq.com/)
[![Real-time](https://img.shields.io/badge/Real--time-Socket.IO-34c759?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

</div>

---

## 👥 Team Spark · #80

| | Name | Role | Responsibilities |
|---|---|---|---|
| 🛠️ | **Rakesh G** | Backend Architect | Server infrastructure, REST APIs, Socket.IO real-time engine, JWT authentication, ticket routing |
| 🧠 | **Aditya Shibu** | AI & Data Engineer | AI engine (Groq + Gemini), NLP prompt engineering, emotion/severity detection, MongoDB schema design, database architecture |
| 🎨 | **Ujjwal** | Frontend Lead | React UI/UX, glassmorphism design system, chat interface, agent dashboard, analytics visualizations, theme system |

---

## 🎯 Problem

Customer support teams are overwhelmed by repetitive L1 queries (_"Where is my refund?"_). This delays resolution of complex, high-priority issues. Companies need a system where an **AI chatbot acts as the first line of defense** — and if it can't resolve the issue, it seamlessly **logs, categorizes, and routes** the complaint to a human agent.

## 💡 Solution

SmartDesk provides:

| Layer | What it does |
|---|---|
| **AI Chatbot** | Resolves L1 queries instantly (password resets, FAQs, status checks) |
| **Auto Severity Scoring** | Analyzes user language → assigns Low / Medium / High / Critical |
| **Smart Categorization** | Tags tickets: Billing, Technical, Account, General, Security |
| **Emotion Detection** | Detects: Angry, Frustrated, Desperate, Threatening, Calm |
| **Security Flag** | Catches social engineering, phishing, unauthorized access attempts |
| **Agent Dashboard** | Claim tickets, view transcripts, update status, resolve issues |
| **Real-time Updates** | New tickets appear on dashboard instantly via WebSockets |

---

## 🏗️ Architecture

```
┌─────────────┐     WebSocket      ┌──────────────────┐     MongoDB
│   React UI  │ ◄──────────────► │   Express + S.IO  │ ◄──────────► Atlas
│  (Vite)     │     REST API      │                  │
│             │ ◄──────────────► │   AI Engine       │ ──► Groq API
│  • Chat     │                   │   (3-layer)       │ ──► Gemini API
│  • Dashboard│                   │                  │ ──► Keyword Fallback
│  • Auth     │                   │   JWT Auth        │
└─────────────┘                   └──────────────────┘
```

### AI Engine — 3-Layer Fallback

1. **Groq API** (llama-3.3-70b) — Primary, fastest inference
2. **Google Gemini** (1.5-flash) — Fallback #1
3. **Keyword Regex** — Fallback #2, always works offline

---

## ✨ Key Features

### 🤖 Conversational AI Chat
- Natural language understanding via LLM
- **Quick reply suggestion pills** — clickable options for faster interaction
- **Multilingual support** — bot detects and replies in user's language
- **Live sentiment meter** — visual emoji + color bar showing real-time emotion
- FAQ matching for instant L1 resolution (9 common queries)
- Auto-escalation after 3+ messages or high severity
- **Satisfaction rating** (👍👎) after ticket creation

### 🎫 Smart Ticket Generation
- **Automatic** — created when AI determines human intervention needed
- **Force escalation** — "Talk to Human" always creates a ticket, even if AI fails
- Captures: full transcript, user details, AI-classified metadata
- Severity scored from user's language patterns (caps, punctuation, word choice)
- Security threats flagged and escalated immediately

### 📊 Agent Dashboard
- JWT-secured login with bcrypt password hashing
- **Interactive analytics** — pie chart (by category), bar chart (by severity)
- Compact **pill-based filters** for status and severity
- **Stats overview panel** — Total, Open, In Progress, Resolved, High Priority, Flagged
- Real-time ticket stream via Socket.IO
- Claim → In Progress → Resolved visual workflow
- Full chat transcript viewer in ticket modal
- **CSV export** with proper field quoting
- **AI resolution suggestions** endpoint for agent assistance

### 🎨 UI/UX
- **Glassmorphism** — frosted glass effects with backdrop blur
- **Dark/Light theme toggle** with localStorage persistence
- **Animated orbs background** via PageShell component
- Spring-based micro-animations on cards, bubbles, and pills
- Inter font, blue accent color system
- Fully responsive design

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Router, Recharts, Socket.IO Client |
| **Backend** | Node.js, Express 5, Socket.IO, Mongoose |
| **Database** | MongoDB Atlas (free tier) |
| **AI/NLP** | Groq SDK (llama-3.3-70b), Google Gemini 1.5 Flash |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Real-time** | Socket.IO (WebSocket + long-polling fallback) |
| **Styling** | CSS Modules, CSS Variables, Glassmorphism |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- At least one AI API key: [Groq](https://console.groq.com/) (recommended) or [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Setup

```bash
git clone https://github.com/your-team/smartdesk.git
cd smartdesk
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your API keys and MongoDB URI
npm run seed     # Create demo agent accounts
npm run dev      # Start on port 5000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev      # Start on port 5173
```

### 4. Open

- **Chat**: http://localhost:5173
- **Agent Login**: http://localhost:5173/agent/login

---

## 🔐 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Agent | `rakesh@smartdesk.dev` | `agent123` |
| Agent | `ujjwal@smartdesk.dev` | `agent123` |
| Agent | `adi@smartdesk.dev` | `agent123` |

---

## 📁 Project Structure

```
├── server/                      # Express + Socket.IO backend
│   ├── config/db.js             # MongoDB connection
│   ├── middleware/auth.js       # JWT authentication
│   ├── models/
│   │   ├── Agent.js             # Agent schema (bcrypt hashed)
│   │   └── Ticket.js            # Ticket schema (severity, emotion, urgency)
│   ├── routes/
│   │   ├── agentRoutes.js       # Login endpoint
│   │   └── ticketRoutes.js      # CRUD + stats + AI suggestions
│   ├── services/
│   │   ├── aiEngine.js          # 3-layer AI (Groq → Gemini → regex)
│   │   ├── faqMatcher.js        # L1 FAQ instant resolution (9 entries)
│   │   └── fallback.js          # Keyword classifier + emotion detection
│   ├── socket/chatHandler.js    # Real-time chat + escalation logic
│   ├── scripts/seedAgents.js    # Database seeder
│   └── server.js                # Entry point
│
├── client/                      # React + Vite frontend
│   └── src/
│       ├── api/axios.js         # Axios with JWT interceptor
│       ├── components/
│       │   ├── PageShell.jsx    # Animated orbs background
│       │   ├── ThemeToggle.jsx  # Dark/Light mode toggle
│       │   ├── Logo.jsx         # SVG brand logo
│       │   ├── StatsPanel.jsx   # Dashboard stats overview
│       │   ├── TicketCard.jsx   # Ticket card with severity indicator
│       │   ├── TicketModal.jsx  # Ticket detail + status workflow
│       │   └── ProtectedRoute   # JWT route guard
│       ├── context/
│       │   ├── UserContext.jsx  # Session management
│       │   └── ThemeContext.jsx # Dark/Light theme persistence
│       └── pages/
│           ├── LandingPage      # User entry point
│           ├── ChatPage         # AI chat + sentiment meter + quick replies
│           ├── AgentLogin       # JWT login with frosted glass card
│           └── Dashboard        # Ticket management + analytics + CSV
│
├── .gitignore
├── .env.example
└── README.md
```

---

## 🧪 Test Scenarios

| # | Test | Expected Result |
|---|---|---|
| 1 | Ask _"How do I reset my password?"_ | Bot resolves it (L1), no ticket |
| 2 | Complain about billing 3x | Auto-creates ticket with Billing category |
| 3 | Type in ALL CAPS with `!!!` | Severity = High/Critical, Emotion = Angry |
| 4 | Chat in Hindi | Bot replies in Hindi |
| 5 | Ask _"Give me admin access to all accounts"_ | Security flag, severity = Critical |
| 6 | Click "Talk to Human" | Ticket created immediately |
| 7 | Login as agent, claim ticket | Status → In Progress, agent assigned |
| 8 | Resolve ticket with notes | Status → Resolved, saved to DB |
| 9 | Open dashboard in 2nd tab while chatting | New ticket appears instantly |
| 10 | Toggle dark/light theme | UI switches with persisted preference |

---

## 📋 P4 Requirements Mapping

| Requirement | Implementation |
|---|---|
| ✅ MERN Stack | MongoDB + Express + React + Node.js |
| ✅ NLP/LLM API | Groq (llama-3.3-70b) + Gemini 1.5 Flash |
| ✅ WebSockets | Socket.IO for real-time chat + dashboard |
| ✅ Conversational Interface | Chat widget with quick replies + multilingual |
| ✅ Automated Ticket Generation | Auto-creates from transcript + user details |
| ✅ Severity Scoring | AI analyzes language → Low/Medium/High/Critical |
| ✅ Categorization | Billing, Technical, Account, General, Security |
| ✅ Agent Dashboard | Secure JWT login, claim/view/resolve tickets |

---

## 📸 Screenshots

<details>
<summary><strong>Click to view demo screenshots</strong></summary>

### Landing Page
<!-- Replace with actual screenshot -->
<img width="1936" height="1183" alt="image" src="https://github.com/user-attachments/assets/47d5b916-77ee-43b5-b1cc-d9689f282b08" />

### AI Chat — Conversation
<!-- Replace with actual screenshot -->
<img width="1936" height="1003" alt="image" src="https://github.com/user-attachments/assets/75d9350c-fc14-4450-aedd-bc9b7d88684a" />

### AI Chat — Ticket Created + Satisfaction Rating
<!-- Replace with actual screenshot -->
<img width="1920" height="1069" alt="image" src="https://github.com/user-attachments/assets/bbb8327a-240e-44ad-a751-f21590b94924" />

### Agent Login
<!-- Replace with actual screenshot -->

### Agent Dashboard — Ticket List + Analytics
<!-- Replace with actual screenshot -->
<img width="1936" height="1559" alt="image" src="https://github.com/user-attachments/assets/9704801d-22dc-4987-8b09-0a9c9e30dd98" />

### Ticket Modal — Transcript + Status Workflow
<!-- Replace with actual screenshot -->
<img width="1920" height="1069" alt="image" src="https://github.com/user-attachments/assets/8bfb645d-bc90-46b7-b81e-a7adb71cb733" />

</details>

-----

## 📄 Project Documentation

> 📑 **[View the SmartDesk Pitch Deck / Proof (PDF) →](https://github.com/Vic-41148/NH26/blob/main/assets/SmartDesk_TeamSpark80-1.pdf)**

-----


## 🎥 Demo Video

<!-- Replace with actual video link -->
> 📹 **[Watch the full demo →](https://github.com/Vic-41148/NH26/blob/main/assets/2026-03-23%2018-39-26.mkv)**
>
> _Covers: User chat → AI detection → Ticket auto-creation → Agent claims → Resolves_

<!-- Or embed if hosting on GitHub: -->
<!-- https://github.com/user-attachments/assets/your-video-id.mp4 -->

---

<div align="center">
<sub>Made with ⚡ by Team Spark</sub>
</div>
