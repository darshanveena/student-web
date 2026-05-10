# Study Planner (Timetable + SMS Reminders)

A student-focused web app that lets you:
- Register/login using **USN + password** (demo, stored in `localStorage`)
- Create your **study timetable** (Slide 2) and persist it per USN
- Add **assignment/project reminders** (Slide 3) with **Google Calendar** links
- (Optional) Send **SMS reminders** via a Node/Express backend using **Twilio** and optional **AI** (OpenAI)

---

## Project structure

- `index.html` – UI (3 slides: auth, timetable, reminders)
- `style.css` – styling
- `script.js` – frontend logic (localStorage persistence, rendering, SMS + calendar URL generation)
- `server.js` – backend API: `POST /api/send-sms`
- `package.json` – Node dependencies
- `TODO.md` – progress notes

---

## Live demo (local)

### 1) Start the backend (SMS server)

```bash
npm install
npm start
```

Server runs on `http://localhost:3000` by default.

### 2) Open the frontend

Open `index.html` in your browser.

> Note: SMS sending requires the backend to be running, and environment variables configured (see below).

---

## SMS backend (server.js)

### Endpoint

- `POST /api/send-sms`

Example payload:

```json
{
  "to": "9876543210",
  "student": {
    "usn": "CS21XYZ",
    "phone": "9876543210",
    "college": "ABC College"
  },
  "slot": {
    "name": "Data Structures",
    "day": "Tue",
    "start": "10:15",
    "end": "11:15",
    "alert": "Please be prepared"
  },
  "useAi": true
}
```

### Environment variables

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM` (Twilio number)
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)

If Twilio variables are missing, the API still returns `{ ok: true, demo: true, message: ... }`.

---

## Google Calendar integration (Slide 3)

For each reminder, the app generates a **Google Calendar “Add event”** URL using the reminder due date/time.

---

## How to use

1. Register (USN, phone, college, password)
2. Login
3. Slide 2: Add study timetable entries
4. Click a timetable slot to see alerts and (optionally) send an SMS
5. Slide 3: Add assignment/project reminders and open the Google Calendar link

---

## Notes / Security

- Authentication + user data are stored in `localStorage` (demo only). Do not use real passwords.
- SMS sending uses the backend; never commit real API keys.

---

## License

MIT (if you want to add a license later, replace this section). 

