(() => {
  const USERS_KEY = 'sp_users_v1';
  const SESSION_KEY = 'sp_session_v1';
  const TIMETABLE_BY_USN_KEY = 'sp_timetable_by_usn_v1';


  const $ = (sel) => document.querySelector(sel);

  function normalizeUsn(usn) {
    return (usn || '').trim().toUpperCase();
  }

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function loadTimetableMap() {
    try {
      return JSON.parse(localStorage.getItem(TIMETABLE_BY_USN_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveTimetableMap(map) {
    localStorage.setItem(TIMETABLE_BY_USN_KEY, JSON.stringify(map));
  }

  function loadTimetableForUsn(usn) {
    const map = loadTimetableMap();
    const key = normalizeUsn(usn);
    return Array.isArray(map[key]) ? map[key] : [];
  }

  function saveTimetableForUsn(usn, slots) {
    const map = loadTimetableMap();
    const key = normalizeUsn(usn);
    map[key] = Array.isArray(slots) ? slots : [];
    saveTimetableMap(map);
  }


  function setSession(usn) {
    if (!usn) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ usn }));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch {
      return null;
    }
  }

  function show(viewId) {
    document.querySelectorAll('.view').forEach((v) => {
      if (v.id === viewId) {
        v.classList.remove('hidden');
      } else {
        v.classList.add('hidden');
      }
    });
  }

  function setMessage(text, isError = false) {
    const msg = $('#authMessage');
    if (!msg) return;
    msg.textContent = text || '';
    msg.style.color = isError ? 'rgba(255, 77, 109, 0.95)' : 'rgba(44, 230, 166, 0.95)';
  }

  function validatePhone(phone) {
    const p = (phone || '').trim();
    // Simple validation for demo: digits length 8..15
    if (!/^\d{8,15}$/.test(p)) return false;
    return true;
  }

  function validateNotBlank(value) {
    return (value || '').trim().length > 0;
  }

  function switchAuthForms(mode) {
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    const goToRegister = $('#goToRegister');
    const goToLogin = $('#goToLogin');

    if (mode === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      $('#authTitle').textContent = 'Login';
      $('#authSubtitle').textContent = 'Welcome back';
      if (goToRegister) goToRegister.textContent = 'Create account';
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      $('#authTitle').textContent = 'Register';
      $('#authSubtitle').textContent = 'Create your student account';
      if (goToLogin) goToLogin.textContent = 'Back to login';
    }
    setMessage('');
  }

  function setTimetableAlert(text, type = 'info') {
    const alertEl = $('#timetableAlert');
    if (!alertEl) return;

    // If no text, hide message area.
    if (!text) {
      alertEl.textContent = '';
      alertEl.setAttribute('data-empty', 'true');
      alertEl.style.opacity = '0';
      alertEl.style.transform = 'translateY(4px)';
      return;
    }

    alertEl.textContent = text;
    alertEl.removeAttribute('data-empty');

    // simple demo color swap
    if (type === 'danger') {
      alertEl.style.borderColor = 'rgba(255, 77, 109, 0.55)';
      alertEl.style.background = 'rgba(255, 77, 109, 0.12)';
    } else {
      alertEl.style.borderColor = 'rgba(75, 211, 255, 0.35)';
      alertEl.style.background = 'rgba(75, 211, 255, 0.10)';
    }

    alertEl.style.opacity = '1';
    alertEl.style.transform = 'translateY(0)';
  }

  function setAlertOnlyWhenDueTimeIsSoon() {
    // Hide all non-critical toasts after a short time.
    // We will only show the alert when a due-time message is set.
    // In this app, timetable due reminder is simulated by class-slot reminders.
    // For now: auto-hide any alert text that is not marked as "due".
  }



  function minutesFromHHMM(hhmm) {
    const [h, m] = String(hhmm || '').split(':').map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  }

  function isValidHHMM(value) {
    const v = String(value || '');
    return /^\d{2}:\d{2}$/.test(v);
  }

  function normalizeTimeInput(value) {
    if (!value) return '';
    // input[type=time] returns HH:MM
    return String(value).slice(0, 5);
  }

  function getStudyFormValues() {
    return {
      name: ($('#fName')?.value || '').trim(),
      day: ($('#fDay')?.value || '').trim(),
      start: normalizeTimeInput($('#fStart')?.value),
      end: normalizeTimeInput($('#fEnd')?.value),


      desc: ($('#fDesc')?.value || '').trim(),
      alert: ($('#fAlert')?.value || '').trim()
    };
  }


  function getNextSlot(slots, now = new Date()) {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    // choose based on first matching weekday slot
    const dayIdx = now.getDay(); // 0 Sun .. 6 Sat
    const dayMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
    const todayLabel = dayMap[dayIdx] || 'Mon';

    const todaySlots = (slots || []).filter((s) => s.day === todayLabel);
    const sorted = [...todaySlots].sort((a, b) => (minutesFromHHMM(a.start) ?? 0) - (minutesFromHHMM(b.start) ?? 0));

    for (const s of sorted) {
      const startM = minutesFromHHMM(s.start);
      if (startM !== null && startM >= nowMins) return s;
    }

    // fallback to first slot tomorrow in order
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const startIdx = Math.max(0, orderedDays.indexOf(todayLabel));
    for (let i = 1; i <= 7; i++) {
      const d = orderedDays[(startIdx + i) % 7];
      const candidate = (slots || []).filter((s) => s.day === d).sort((a, b) => (minutesFromHHMM(a.start) ?? 0) - (minutesFromHHMM(b.start) ?? 0));
      if (candidate[0]) return candidate[0];
    }

    return null;
  }

  function setSelectedClass(slot) {
    $('#selectedTitle').textContent = slot?.name || 'No class selected';
    $('#selectedDay').textContent = slot?.day || '—';
    $('#selectedStart').textContent = slot?.start || '—';
    $('#selectedEnd').textContent = slot?.end || '—';

    $('#selectedDesc').textContent = slot?.desc || 'Choose a slot from the left to see features, times, and reminders.';
    $('#selectedAlert').textContent = slot?.alert || 'Select a class to view alert message.';
  }

  function renderTimetable(slots) {
    const mount = $('#timetableSlots');
    if (!mount) return;

    const safeSlots = Array.isArray(slots) ? slots : [];
    if (!safeSlots.length) {
      mount.innerHTML = '<div class="muted">No timetable loaded.</div>';
      setSelectedClass(null);
      setTimetableAlert('', 'info');
      return;
    }

    // Keep the top alert cleared until user selects a class slot.
    // (Previously this showed a “Next class: ...” reminder.)
    setTimetableAlert('', 'info');

    // Reset selected-right details until user clicks a slot.
    setSelectedClass(null);



    mount.innerHTML = safeSlots
      .slice()
      .sort((a, b) => {
        const da = a.day.localeCompare(b.day);
        if (da !== 0) return da;
        return (minutesFromHHMM(a.start) ?? 0) - (minutesFromHHMM(b.start) ?? 0);
      })
      .map(
        (s, idx) => `
          <button class="ttSlotBtn" type="button" data-slot-idx="${idx}" aria-label="${s.name} ${s.day} ${s.start}">
            <div class="ttSlotTop">
              <div class="ttSlotName">${s.name}</div>
              <div class="ttSlotTime">${s.start} - ${s.end}</div>
            </div>
            <div class="muted" style="font-size:12px;">${s.day}</div>

          </button>
        `
      )
      .join('');

    const buttons = Array.from(mount.querySelectorAll('.ttSlotBtn'));
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const slot = safeSlots.slice()
          .sort((a, b) => {
            const da = a.day.localeCompare(b.day);
            if (da !== 0) return da;
            return (minutesFromHHMM(a.start) ?? 0) - (minutesFromHHMM(b.start) ?? 0);
          })[i];

        setSelectedClass(slot);

        const msg = slot?.alert || `Reminder: ${slot.name} starts at ${slot.start}.`;
        // Show message in UI
        setTimetableAlert(msg, 'danger');

        // AI + Twilio SMS to registered number (via backend)
        try {
        handleSmsSendForSlot({ student, slot });

        } catch {}


        // Auto-hide after a while so it doesn't stay on every action.
        window.clearTimeout(window.__spAlertTimer);
        window.__spAlertTimer = window.setTimeout(() => setTimetableAlert('', 'info'), 6500);

      });
    });

    // Do not auto-select. User must click a slot to view details.
  }


  function setStudentDetailsOpen(isOpen) {
    const overlay = $('#studentDetailsOverlay');
    const panel = $('#studentDetailsPanel');
    const btn = $('#profileToggleBtn');
    const closeBtn = $('#studentDetailsCloseBtn');
    if (!overlay || !panel || !btn || !closeBtn) return;

    if (isOpen) {
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      panel.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('studentDetailsOpen');
    } else {
      document.body.classList.remove('studentDetailsOpen');
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      panel.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  function renderDashboard(student) {
    const usn = student?.usn ? String(student.usn) : '';
    $('#welcomeText').textContent = usn ? `Welcome, ${usn}` : 'Welcome';



    const personalKV = $('#studentKV');
    const academicGrid = $('#studentAcademicGrid');
    const subtitle = $('#studentDetailsSubtitle');

    if (personalKV) {
      const items = [
        ['USN', student.usn],
        ['Phone', student.phone],
        ['College', student.college]
      ];

      personalKV.innerHTML = items
        .map(
          ([k, v]) => `
            <div class="kvItem">
              <strong>${k}</strong>
              <span>${String(v || '')}</span>
            </div>
          `
        )
        .join('');
    }

    if (subtitle) {
      subtitle.textContent = student?.usn ? `USN: ${student.usn}` : '—';
    }


    if (academicGrid) {
      const items = [
        ['Programme', 'Undergraduate (demo)'],
        ['Batch', '2026 (demo)'],
        ['College', student?.college || '—']
      ];

      academicGrid.innerHTML = items
        .map(
          ([k, v]) => `
            <div class="kvItem">
              <strong>${k}</strong>
              <span>${String(v || '')}</span>
            </div>
          `
        )
        .join('');
    }

    // student-entered timetable (persisted)
    const savedSlots = loadTimetableForUsn(student.usn);
    renderTimetable(savedSlots);

    // slide 3 reminders (persisted)
    renderSlide3Reminders(loadRemindersForUsn(student.usn));

    // keep student details panel collapsed until user clicks avatar
    setStudentDetailsOpen(false);

  }




  function validateAndBuildSlot(values) {
    const name = (values?.name || '').trim();
    const day = (values?.day || '').trim();
    const start = normalizeTimeInput(values?.start);
    const end = normalizeTimeInput(values?.end);

    if (!name) return { ok: false, error: 'Enter class / subject name.' };
    if (!day) return { ok: false, error: 'Select day.' };
    if (!isValidHHMM(start)) return { ok: false, error: 'Enter valid start time (HH:MM).' };
    if (!isValidHHMM(end)) return { ok: false, error: 'Enter valid end time (HH:MM).' };

    const sM = minutesFromHHMM(start);
    const eM = minutesFromHHMM(end);
    if (sM === null || eM === null || sM >= eM) {
      return { ok: false, error: 'End time must be greater than start time.' };
    }

    const slot = {
      day,
      name,
      start,
      end,
      desc: (values?.desc || '').trim(),


      alert: (values?.alert || '').trim()
    };

    return { ok: true, slot };
  }

  function clearStudyForm() {
    const ids = ['fName', 'fDay', 'fStart', 'fEnd', 'fRoom', 'fTeacher', 'fDesc', 'fAlert'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.value = '';
      else el.value = '';
    });
  }

  function sendSmsReminder({ to, student, slot, useAi = true }) {
    // Calls local backend to send SMS (Twilio + optional AI).
    // Backend must be running separately (server.js).
    return fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, student, slot, useAi })
    }).then((r) => r.json());
  }

  async function handleSmsSendForSlot({ student, slot }) {
    const phone = student?.phone;
    if (!phone) {
      setTimetableAlert('No phone number found for this student.', 'danger');
      return;
    }

    // Build SMS message text via AI on backend, using slot.alert if present.
    const res = await sendSmsReminder({ to: phone, student, slot, useAi: true });
    if (!res?.ok) {
      setTimetableAlert(`SMS send failed: ${res?.error || 'unknown error'}`, 'danger');
      return;
    }
    setTimetableAlert(`SMS sent to your number.`, 'info');
  }

  function handleAddStudyDetails(e) {

    e.preventDefault();

    const session = getSession();
    if (!session?.usn) {
      setTimetableAlert('Login to add your timetable.', 'danger');
      return;
    }

    const values = getStudyFormValues();
    const res = validateAndBuildSlot(values);
    if (!res.ok) {
      setTimetableAlert(res.error, 'danger');
      return;
    }

    const current = loadTimetableForUsn(session.usn);
    current.push(res.slot);
    saveTimetableForUsn(session.usn, current);

    const users = loadUsers();
    const student = users[session.usn];
    renderTimetable(loadTimetableForUsn(student?.usn || session.usn));

    setTimetableAlert(`Added: ${res.slot.name} (${res.slot.day}) ${res.slot.start}-${res.slot.end}`, 'info');
    clearStudyForm();
  }

  function handleClearTimetable() {
    const session = getSession();
    if (!session?.usn) {
      setTimetableAlert('Login to clear your timetable.', 'danger');
      return;
    }

    saveTimetableForUsn(session.usn, []);
    renderTimetable([]);
    setTimetableAlert('Timetable cleared.', 'info');
  }



  function handleRegister(e) {
    e.preventDefault();
    setMessage('');

    const usn = normalizeUsn($('#regUSN').value);
    const phone = ($('#regPhone').value || '').trim();
    const college = ($('#regCollege').value || '').trim();
    const pass = $('#regPassword').value || '';
    const confirm = $('#regConfirmPassword').value || '';

    if (!validateNotBlank(usn)) return setMessage('Please enter USN.', true);
    if (!validateNotBlank(college)) return setMessage('Please enter college.', true);
    if (!validatePhone(phone)) return setMessage('Enter a valid phone number (8-15 digits).', true);
    if (!pass || pass.length < 6) return setMessage('Password must be at least 6 characters.', true);
    if (pass !== confirm) return setMessage('Passwords do not match.', true);

    const users = loadUsers();
    if (users[usn]) return setMessage('This USN is already registered. Please login.', true);

    users[usn] = {
      usn,
      phone,
      college,
      password: pass // demo only (no hashing)
    };

    saveUsers(users);
    setSession(usn);

    renderDashboard(users[usn]);
    show('dashboardView');
  }

  function handleLogin(e) {
    e.preventDefault();
    setMessage('');

    const usn = normalizeUsn($('#loginUSN').value);
    const pass = $('#loginPassword').value || '';

    if (!validateNotBlank(usn)) return setMessage('Please enter USN.', true);
    if (!validateNotBlank(pass)) return setMessage('Please enter password.', true);

    const users = loadUsers();
    const student = users[usn];

    if (!student || student.password !== pass) {
      return setMessage('Invalid USN or password.', true);
    }

    setSession(usn);
    renderDashboard(student);
    show('dashboardView');
  }

  function handleLogout() {
    setSession(null);
    setMessage('Logged out successfully.');
    // clear messages but keep auth view
    show('authView');

    // reset forms
    $('#loginUSN').value = '';
    $('#loginPassword').value = '';
    $('#regUSN').value = '';
    $('#regPhone').value = '';
    $('#regCollege').value = '';
    $('#regPassword').value = '';
    $('#regConfirmPassword').value = '';

    switchAuthForms('login');
  }

  const REMINDERS_BY_USN_KEY = 'sp_reminders_by_usn_v1';

  function loadRemindersMap() {
    try {
      return JSON.parse(localStorage.getItem(REMINDERS_BY_USN_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveRemindersMap(map) {
    localStorage.setItem(REMINDERS_BY_USN_KEY, JSON.stringify(map));
  }

  function loadRemindersForUsn(usn) {
    const map = loadRemindersMap();
    const key = normalizeUsn(usn);
    return Array.isArray(map[key]) ? map[key] : [];
  }

  function saveRemindersForUsn(usn, reminders) {
    const map = loadRemindersMap();
    const key = normalizeUsn(usn);
    map[key] = Array.isArray(reminders) ? reminders : [];
    saveRemindersMap(map);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatIndianDate(dateStr) {
    // dateStr: YYYY-MM-DD
    const d = new Date(dateStr + 'T00:00:00');
    if (!Number.isFinite(d.getTime())) return dateStr || '—';
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function formatTime12h(hhmm) {
    // hhmm: HH:MM
    const [hhS, mmS] = String(hhmm || '').split(':');
    const hh = Number(hhS);
    const mm = Number(mmS);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '—';
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}:${pad2(mm)} ${ampm}`;
  }

  function minutesFromHHMMAny(hhmm) {
    return minutesFromHHMM(hhmm);
  }

  function formatGoogleDateTime(dateStr, hhmm) {
    // Google expects YYYYMMDDTHHMMSS
    const d = new Date(dateStr + 'T00:00:00');
    if (!Number.isFinite(d.getTime())) return '';
    const [hhS, mmS] = String(hhmm || '').split(':');
    const hh = Number(hhS);
    const mm = Number(mmS);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '';

    const yyyy = d.getFullYear();
    const MM = pad2(d.getMonth() + 1);
    const DD = pad2(d.getDate());
    const hh2 = pad2(hh);
    const mm2 = pad2(mm);
    return `${yyyy}${MM}${DD}T${hh2}${mm2}00`;
  }

  function addMinutesToDateTime(dateStr, hhmm, addMins) {
    const baseM = minutesFromHHMMAny(hhmm);
    const d = new Date(dateStr + 'T00:00:00');
    if (!Number.isFinite(d.getTime()) || baseM === null) return { dateStr: dateStr, hhmm };
    const total = baseM + addMins;
    const dayOffset = Math.floor(total / (24 * 60));
    const minsInDay = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
    const newD = new Date(d.getTime() + dayOffset * 86400000);
    const hh = Math.floor(minsInDay / 60);
    const mm = minsInDay % 60;
    return {
      dateStr: `${newD.getFullYear()}-${pad2(newD.getMonth() + 1)}-${pad2(newD.getDate())}`,
      hhmm: `${pad2(hh)}:${pad2(mm)}`
    };
  }

  function buildGoogleCalendarUrl({ title, dateStr, dueTime, durationMins = 60, notes = '' }) {
    const start = formatGoogleDateTime(dateStr, dueTime);
    const added = addMinutesToDateTime(dateStr, dueTime, durationMins);
    const end = formatGoogleDateTime(added.dateStr, added.hhmm);
    if (!start || !end) return '';

    const text = encodeURIComponent(title || 'Reminder');
    const details = encodeURIComponent(notes || '');

    const dates = `${start}/${end}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${encodeURIComponent(dates)}`;
  }

  function validateAndBuildReminder(values) {
    const type = (values?.type || '').trim();
    const title = (values?.title || '').trim();
    const dueDate = (values?.dueDate || '').trim();
    const dueTime = normalizeTimeInput(values?.dueTime || '');
    const notes = (values?.notes || '').trim();

    if (!type) return { ok: false, error: 'Select reminder type.' };
    if (!title) return { ok: false, error: 'Enter title / topic.' };
    if (!dueDate) return { ok: false, error: 'Select due date.' };
    if (!isValidHHMM(dueTime)) return { ok: false, error: 'Enter due time (HH:MM).' };

    return {
      ok: true,
      reminder: {
        id: String(Date.now()) + Math.random().toString(16).slice(2),
        type,
        title,
        dueDate,
        dueTime,
        notes,
        createdAt: Date.now()
      }
    };
  }

  function getReminderFormValues() {
    return {
      type: ($('#rType')?.value || '').trim(),
      title: ($('#rTitle')?.value || '').trim(),
      dueDate: ($('#rDueDate')?.value || '').trim(),
      dueTime: ($('#rDueTime')?.value || '').trim(),
      notes: ($('#rNotes')?.value || '').trim()
    };
  }

  function clearReminderForm() {
    const ids = ['rType', 'rTitle', 'rDueDate', 'rDueTime', 'rNotes'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.value = '';
      else el.value = '';
    });
  }

  function renderSlide3Reminders(reminders) {
    const mount = $('#reminderRows');
    if (!mount) return;
    const safe = Array.isArray(reminders) ? reminders : [];
    if (!safe.length) {
      mount.innerHTML = '<div class="muted">No reminders added yet.</div>';
      return;
    }

    // Sort by due date/time
    const sorted = safe.slice().sort((a, b) => {
      const da = String(a?.dueDate || '');
      const db = String(b?.dueDate || '');
      if (da !== db) return da.localeCompare(db);
      return (minutesFromHHMM(a?.dueTime) ?? 0) - (minutesFromHHMM(b?.dueTime) ?? 0);
    });

    mount.innerHTML = `
      <div class="slide3TableWrap">
        <table class="slide3Table" aria-label="Reminders table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Due</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sorted
              .map((r) => {
                const indDate = formatIndianDate(r.dueDate);
                const t = formatTime12h(r.dueTime);
                const gCal = buildGoogleCalendarUrl({
                  title: `${r.type}: ${r.title}`,
                  dateStr: r.dueDate,
                  dueTime: r.dueTime,
                  durationMins: 60,
                  notes: r.notes
                });

                const notesText = r.notes ? r.notes : '—';
                return `
                  <tr class="slide3Row" data-reminder-id="${r.id}">
                    <td><span class="pill ${r.type === 'Assignment' ? 'pillBlue' : 'pillCyan'}">${r.type}</span></td>
                    <td><strong>${r.title}</strong></td>
                    <td>${indDate} • ${t}</td>
                    <td class="muted">${notesText}</td>
                    <td class="slide3ActionsCell">
                      <a class="btn ghost" target="_blank" rel="noopener" href="${gCal || '#'}" ${gCal ? '' : 'aria-disabled="true"'}>Google Calendar</a>
                      <button class="btn primary" type="button" data-sms-remind="${r.id}">Send SMS</button>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    mount.querySelectorAll('[data-sms-remind]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const session = getSession();
        if (!session?.usn) {
          setTimetableAlert('Login to send reminders.', 'danger');
          return;
        }

        const remindersNow = loadRemindersForUsn(session.usn);
        const id = btn.getAttribute('data-sms-remind');
        const reminder = remindersNow.find((x) => String(x?.id) === String(id));
        const users = loadUsers();
        const student = users[session.usn];

        if (!student?.phone) {
          setTimetableAlert('No phone number found for this student.', 'danger');
          return;
        }
        if (!reminder) {
          setTimetableAlert('Reminder not found.', 'danger');
          return;
        }

        // Reuse backend SMS endpoint by passing reminder as slot-like payload.
        // Backend uses AI prompt based on slot.name/day/start/end/alert.
        // We map reminder fields to that shape.
        const pseudoSlot = {
          name: `${reminder.type}: ${reminder.title}`,
          day: 'Every day',
          start: formatTime12h(reminder.dueTime),
          end: '',
          alert: reminder.notes ? `Alert: ${reminder.notes}` : 'Please be prepared.'
        };

        try {
          const res = await sendSmsReminder({
            to: student.phone,
            student,
            slot: pseudoSlot,
            useAi: true
          });

          if (!res?.ok) {
            setTimetableAlert(`SMS send failed: ${res?.error || 'unknown error'}`, 'danger');
            return;
          }
          setTimetableAlert('SMS sent to your number.', 'info');
        } catch (e) {
          setTimetableAlert('SMS send failed.', 'danger');
        }
      });
    });
  }

  function handleAddReminder(e) {
    e.preventDefault();

    const session = getSession();
    if (!session?.usn) {
      setTimetableAlert('Login to add reminders.', 'danger');
      return;
    }

    const values = getReminderFormValues();
    const res = validateAndBuildReminder(values);
    if (!res.ok) {
      setTimetableAlert(res.error, 'danger');
      return;
    }

    const current = loadRemindersForUsn(session.usn);
    current.push(res.reminder);
    saveRemindersForUsn(session.usn, current);

    renderSlide3Reminders(loadRemindersForUsn(session.usn));
    setTimetableAlert('Reminder added.', 'info');
    clearReminderForm();
  }

  function handleClearReminders() {
    const session = getSession();
    if (!session?.usn) {
      setTimetableAlert('Login to clear reminders.', 'danger');
      return;
    }

    saveRemindersForUsn(session.usn, []);
    renderSlide3Reminders([]);
    setTimetableAlert('Reminders cleared.', 'info');
  }

  function init() {

    // Wire buttons/forms if present
    const profileToggleBtn = $('#profileToggleBtn');
    const overlay = $('#studentDetailsOverlay');
    const closeBtn = $('#studentDetailsCloseBtn');

    if (profileToggleBtn) {
      profileToggleBtn.addEventListener('click', () => {
        const isOpen = document.body.classList.contains('studentDetailsOpen');
        setStudentDetailsOpen(!isOpen);
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => setStudentDetailsOpen(false));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => setStudentDetailsOpen(false));
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setStudentDetailsOpen(false);
    });


    const loginForm = $('#loginForm');

    const registerForm = $('#registerForm');
    const logoutBtn = $('#logoutBtn');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const goToRegister = $('#goToRegister');
    const goToLogin = $('#goToLogin');

    if (goToRegister) goToRegister.addEventListener('click', () => switchAuthForms('register'));
    if (goToLogin) goToLogin.addEventListener('click', () => switchAuthForms('login'));

    const refreshDemoBtn = $('#refreshDemoBtn');
    if (refreshDemoBtn) {
      refreshDemoBtn.addEventListener('click', () => {
        const session = getSession();
        if (!session?.usn) {
          setTimetableAlert('Login to load your timetable.', 'danger');
          return;
        }

    // demo schedule removed; user must add study details manually.
        const demoSlots = [

          {
            day: 'Mon',
            name: 'Maths / Calculus',
            start: '09:00',
            end: '10:00',
            room: 'B-201',

            desc: 'Concepts + problem solving. Bring notes and calculator.',
            alert: 'Alert: Maths starts at 09:00. Review formulas before class.'
          },
          {
            day: 'Mon',
            name: 'Data Structures',
            start: '10:15',
            end: '11:15',
            room: 'C-110',
            teacher: 'Prof. S. Iyer',
            desc: 'Trees, stacks, and time complexity with examples.',
            alert: 'Data Structures at 10:15. Complete yesterday’s assignment.'
          },
          {
            day: 'Tue',
            name: 'Operating Systems',
            start: '09:30',
            end: '10:30',
            room: 'A-105',
            teacher: 'Ms. N. Rao',
            desc: 'Processes, scheduling, and deadlocks overview.',
            alert: 'OS class at 09:30. Revise scheduling basics.'
          },
          {
            day: 'Wed',
            name: 'Web Development',
            start: '13:00',
            end: '14:30',
            room: 'Lab-1',
            teacher: 'Mr. K. Sharma',
            desc: 'Frontend components and UI states (login/tables).',
            alert: 'Web Dev at 13:00. Prepare 2 UI screenshots for review.'
          },
          {
            day: 'Thu',
            name: 'DBMS',
            start: '11:00',
            end: '12:00',
            room: 'B-203',
            teacher: 'Dr. P. Mehta',
            desc: 'SQL queries, indexes, and normalization examples.',
            alert: 'DBMS starts at 11:00. Practice 5 SQL queries.'
          }
        ];

        saveTimetableForUsn(session.usn, demoSlots);

        const users = loadUsers();
        const student = users[session.usn];
        if (!student) return;

        renderDashboard(student);
        setTimetableAlert('Demo schedule loaded. Select a class slot.', 'info');
      });
    }

    const studyForm = $('#studyForm');
    if (studyForm) studyForm.addEventListener('submit', handleAddStudyDetails);

    const clearTimetableBtn = $('#clearTimetableBtn');
    if (clearTimetableBtn) {
      clearTimetableBtn.addEventListener('click', handleClearTimetable);
    }



    // Restore session
    const session = getSession();
    if (session?.usn) {
      const users = loadUsers();
      const student = users[session.usn];
      if (student) {
        renderDashboard(student);
        show('dashboardView');
        switchAuthForms('login');
        return;
      }
      // stale session
      setSession(null);
    }

    show('authView');
    switchAuthForms('login');
  }

  init();
})();



