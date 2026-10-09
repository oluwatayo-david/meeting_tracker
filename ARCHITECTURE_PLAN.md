# AI Meeting Action Point Tracker & Execution Verifier
## Updated Architecture & Prototype Plan

### 1. Updated Tech Stack (Selected for Highest Efficiency & Free Tiers)
- **UI Framework & Styling**: **shadcn/ui** + Tailwind CSS + Lucide Icons
- **ORM & Data Layer**: **Prisma ORM**
- **Database & Auth**: **Supabase** (PostgreSQL with free tier 500MB DB, Auth & RLS)
- **File & Audio Storage**: **Supabase Storage** (1GB free storage for audio and evidence)
- **AI Audio & Action Point Extractor**: **Google Gemini 1.5 Flash Audio** (Free tier on Google AI Studio: 15 RPM / 1M TPM / 1500 RPD)
- **AI Task Research Co-Pilot**: **Google Gemini 1.5 Flash** (Free tier)
- **Email Notifications**: **EmailJS** (Free tier 200 emails/month, client/server direct dispatch)
- **Background Jobs & Cron**: **Supabase pg_cron / Vercel Cron** (100% free serverless scheduled alerts)

---

### 2. Meeting Permission & Routing Logic
- **Internal Meetings**:
  - Creator selects specific internal staff/members or departments.
  - Access is restricted via permissions & Supabase RLS so only invited members and authorized managers can view the meeting notes and delegated action items.
  - EmailJS automatically routes assigned action points and private workspace links **only to the selected internal users**.
- **External Meetings**:
  - For cross-partner, client, or public sessions.
  - Generates a shareable meeting viewer link.
  - EmailJS automatically broadcasts the meeting link, agenda, and minutes summary **to everyone (both internal and external participants)**.
  - Action verification authority remains strictly internal (only managers can approve/reject proof submissions).

---

### 3. Core Modules in the Prototype
1. **Meeting Creation & Permission Selector**: Toggle between Internal (multi-user selector) and External (email list broadcast).
2. **Audio Recorder & AI Extraction**: Browser voice recording + Gemini 1.5 Flash audio transcription and action point extraction.
3. **Action Point Board & AI Co-Pilot**: Assignee dashboard with 1-click AI research assistant providing execution steps & templates.
4. **Proof of Work Submission & Manager Review Portal**: Upload evidence files/links, manager Approve / Reject with audit log.
5. **EmailJS Integration**: Automated dispatch for meeting invites, assigned tasks, and deadline reminders.
6. **SCIDaR Innovation Dashboard**: Turnaround metrics, task resolution rates, and efficiency gains.
