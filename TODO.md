# TODO

- [x] Update `index.html` to add professional auth + dashboard slide structure (login/register + hidden dashboard)
- [x] Redesign `style.css` with modern responsive UI, card layout, and smooth view transitions
- [x] Refactor `script.js` to add:
  - [x] Register student (USN, phone, college, password) with validation
  - [x] Login student using USN + password
  - [x] Persist users + session in `localStorage`
  - [x] Dashboard view rendering (placeholder for next slide)
- [x] Verify in browser: registration, login, logout, view switching works
- [x] Keep existing study planner task features ready to integrate after next slide requirements

- [x] Implement next page 2-column timetable slide (Slide 2)
  - [x] Update `index.html` with left timetable features + right details panel + alert area
  - [x] Update `style.css` with timetable row styling and responsive layout
  - [x] Update `script.js` to render timetable times and show an alert/message

- [x] Slide 2 enhancement: generate timetable from student-entered study details
  - [x] Add “Add study details” form UI on Slide 2 in `index.html`
  - [x] Add persistence model in `script.js`: save/load timetable slots per USN
  - [x] Replace `demoSlots` data source with saved slots on dashboard render
  - [x] Implement handler: validate inputs and push new slot into timetable, then re-render
  - [x] Basic validation: day, class name, start/end HH:MM and start < end
  - [x] Quick manual test checklist

- [x] SMS reminders forwarded to registered mobile number (Twilio/AI optional)

- [ ] Slide 3: Assignment + Project reminder table + Google Calendar integration
  - [x] Add Slide 3 UI section in `index.html` (reminder form + reminder list + Google Calendar buttons)
- [ ] Add reminder persistence in `script.js` per USN
  - [ ] Indian date formatting + 12-hour time formatting (AM/PM) in reminder list
  - [ ] Generate Google Calendar create-event URL (60 minutes duration)
  - [ ] SMS alert for each reminder forwards to registered `phone` via `/api/send-sms`
  - [ ] Add styling in `style.css`
  - [ ] Run basic flow test


