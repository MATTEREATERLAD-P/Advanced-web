const PAGES = ['home','login','register','doctors','book','my-appointments','admin'];

function navigate(page) {
  if (['book','my-appointments'].includes(page) && !API.isLoggedIn()) return navigate('login');
  if (page === 'admin' && !API.isAdmin()) return navigate('home');
  PAGES.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.classList.toggle('active', p === page);
  });
  if (page === 'home')            loadHomeStats();
  if (page === 'doctors')         loadDoctors();
  if (page === 'book')            loadBookForm();
  if (page === 'my-appointments') loadMyAppointments();
  if (page === 'admin')           loadAdminPanel();
  window.scrollTo(0, 0);
}

function updateNav() {
  const loggedIn = API.isLoggedIn();
  const admin    = API.isAdmin();
  const user     = API.getUser();
  document.getElementById('btn-login').style.display    = loggedIn ? 'none' : '';
  document.getElementById('btn-register').style.display = loggedIn ? 'none' : '';
  document.getElementById('btn-logout').style.display   = loggedIn ? '' : 'none';
  document.getElementById('nav-book').style.display     = loggedIn && !admin ? '' : 'none';
  document.getElementById('nav-myappts').style.display  = loggedIn && !admin ? '' : 'none';
  document.getElementById('nav-admin').style.display    = admin ? '' : 'none';
  document.getElementById('nav-user').textContent       = loggedIn ? `👤 ${user.name.split(' ')[0]}` : '';
}

async function loadHomeStats() {
  try {
    const doctors = await API.getDoctors();
    document.getElementById('stat-doctors').textContent = doctors.length;
    let openSlots = 0;
    for (const d of doctors) {
      const slots = await API.getDoctorSlots(d.id);
      const today = new Date().toISOString().split('T')[0];
      openSlots += slots.filter(s => s.slot_date.startsWith(today)).length;
    }
    document.getElementById('stat-slots').textContent = openSlots;
    if (API.isAdmin()) {
      const appts = await API.getAllAppointments();
      document.getElementById('stat-appts').textContent = appts.length;
    } else {
      document.getElementById('stat-appts').textContent = '100+';
    }
  } catch (e) {}
}

async function loadDoctors() {
  const container = document.getElementById('doctors-list');
  container.innerHTML = '<p>Loading...</p>';
  try {
    const doctors = await API.getDoctors();
    if (!doctors.length) { container.innerHTML = '<p>No doctors registered yet.</p>'; return; }
    container.innerHTML = doctors.map(d => `
      <div class="card">
        <div style="font-size:2.5rem;margin-bottom:.5rem">${deptIcon(d.specialization)}</div>
        <div class="card-tag">${d.specialization}</div>
        <div class="card-title">${d.full_name}</div>
        <div class="card-sub">${d.bio || 'University clinic doctor.'}</div>
        <div style="font-size:.8rem;color:var(--muted);margin-bottom:.8rem">📅 ${d.available_days}</div>
        ${API.isLoggedIn() && !API.isAdmin()
          ? `<button class="btn btn-primary btn-sm" onclick="goBookWith(${d.id})">Book Appointment</button>`
          : `<button class="btn btn-outline btn-sm" onclick="navigate('register')">Register to Book</button>`}
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<p style="color:red">Failed to load doctors.</p>';
  }
}

function deptIcon(spec) {
  if (spec.toLowerCase().includes('dental')) return '🦷';
  if (spec.toLowerCase().includes('mental')) return '🧠';
  if (spec.toLowerCase().includes('physio')) return '💪';
  if (spec.toLowerCase().includes('nutri'))  return '🥗';
  return '🩺';
}

function goBookWith(doctorId) {
  navigate('book');
  setTimeout(() => {
    document.getElementById('book-doctor').value = doctorId;
    loadSlots();
  }, 100);
}

async function loadBookForm() {
  const doctorSel = document.getElementById('book-doctor');
  doctorSel.innerHTML = '<option value="">— Choose a doctor —</option>';
  document.getElementById('slots-group').style.display = 'none';
  try {
    const doctors = await API.getDoctors();
    doctors.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.full_name} — ${d.specialization}`;
      doctorSel.appendChild(opt);
    });
  } catch (e) {}
}

async function loadSlots() {
  const doctorId = document.getElementById('book-doctor').value;
  const slotSel  = document.getElementById('book-slot');
  const group    = document.getElementById('slots-group');
  if (!doctorId) { group.style.display = 'none'; return; }
  slotSel.innerHTML = '<option value="">Loading slots...</option>';
  group.style.display = 'block';
  try {
    const slots = await API.getDoctorSlots(doctorId);
    if (!slots.length) { slotSel.innerHTML = '<option value="">No available slots</option>'; return; }
    slotSel.innerHTML = '<option value="">— Choose a slot —</option>';
    slots.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${formatDate(s.slot_date)} at ${formatTime(s.slot_time)}`;
      slotSel.appendChild(opt);
    });
  } catch (e) {
    slotSel.innerHTML = '<option value="">Error loading slots</option>';
  }
}

async function doBook() {
  const alertEl   = document.getElementById('book-alert');
  const doctor_id = document.getElementById('book-doctor').value;
  const slot_id   = document.getElementById('book-slot').value;
  const reason    = document.getElementById('book-reason').value.trim();
  if (!doctor_id) return showAlert(alertEl, 'Please select a doctor.');
  if (!slot_id)   return showAlert(alertEl, 'Please select a time slot.');
  if (!reason)    return showAlert(alertEl, 'Please describe your reason for visiting.');
  try {
    await API.bookAppointment({ doctor_id, slot_id, reason });
    showAlert(alertEl, 'Appointment booked successfully!', 'success');
    document.getElementById('book-reason').value = '';
    document.getElementById('book-doctor').value = '';
    document.getElementById('slots-group').style.display = 'none';
    setTimeout(() => navigate('my-appointments'), 1500);
  } catch (e) {
    showAlert(alertEl, e.message);
  }
}

async function loadMyAppointments() {
  const container = document.getElementById('my-appts-list');
  container.innerHTML = 'Loading...';
  try {
    const appts = await API.getMyAppointments();
    if (!appts.length) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:3rem">
          <div style="font-size:3rem">📋</div>
          <p style="color:var(--muted);margin-top:.5rem">No appointments yet.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="navigate('book')">Book Now</button>
        </div>`;
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Doctor</th><th>Specialization</th><th>Date</th>
              <th>Time</th><th>Reason</th><th>Status</th><th>Notes</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${appts.map(a => `
              <tr>
                <td><strong>${a.doctor_name}</strong></td>
                <td>${a.specialization}</td>
                <td>${formatDate(a.slot_date)}</td>
                <td>${formatTime(a.slot_time)}</td>
                <td>${a.reason}</td>
                <td>${badge(a.status)}</td>
                <td style="color:var(--muted);font-size:.8rem">${a.notes || '—'}</td>
                <td>
                  ${a.status !== 'completed' && a.status !== 'cancelled'
                    ? `<button class="btn btn-danger btn-sm" onclick="cancelAppt(${a.id})">Cancel</button>`
                    : '—'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    container.innerHTML = '<p style="color:red">Failed to load appointments.</p>';
  }
}

async function cancelAppt(id) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  try {
    await API.cancelAppointment(id);
    loadMyAppointments();
  } catch (e) { alert(e.message); }
}

async function loadAdminPanel() {
  loadAdminAppointments();
  loadAdminDoctors();
  populateAdminDoctorDropdown();
}

async function loadAdminAppointments() {
  const wrap = document.getElementById('admin-appts-wrap');
  wrap.innerHTML = 'Loading...';
  try {
    const appts = await API.getAllAppointments();
    if (!appts.length) { wrap.innerHTML = '<p>No appointments yet.</p>'; return; }
    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th><th>Adm. No</th><th>Doctor</th><th>Date</th>
              <th>Time</th><th>Reason</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${appts.map(a => `
              <tr>
                <td><strong>${a.student_name}</strong></td>
                <td>${a.admission_no}</td>
                <td>${a.doctor_name}</td>
                <td>${formatDate(a.slot_date)}</td>
                <td>${formatTime(a.slot_time)}</td>
                <td>${a.reason}</td>
                <td>${badge(a.status)}</td>
                <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                  <button class="btn btn-primary btn-sm" onclick="openStatusModal(${a.id},'${a.status}')">Update</button>
                  <button class="btn btn-accent btn-sm" onclick="openPrescriptionModal(${a.id})">Rx</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {
    wrap.innerHTML = '<p style="color:red">Failed to load appointments.</p>';
  }
}

async function loadAdminDoctors() {
  const wrap = document.getElementById('admin-doctors-list');
  try {
    const docs = await API.getDoctors();
    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Specialization</th><th>Available Days</th><th>Action</th></tr></thead>
          <tbody>
            ${docs.map(d => `
              <tr>
                <td>${d.full_name}</td>
                <td>${d.specialization}</td>
                <td>${d.available_days}</td>
                <td><button class="btn btn-danger btn-sm" onclick="doDeleteDoctor(${d.id})">Remove</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (e) {}
}

async function populateAdminDoctorDropdown() {
  try {
    const docs = await API.getDoctors();
    const sel = document.getElementById('slot-doctor-id');
    sel.innerHTML = '<option value="">— Select doctor —</option>';
    docs.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id;
      o.textContent = `${d.full_name} — ${d.specialization}`;
      sel.appendChild(o);
    });
  } catch (e) {}
}

async function doAddDoctor() {
  const alertEl        = document.getElementById('add-doctor-alert');
  const full_name      = document.getElementById('doc-name').value.trim();
  const specialization = document.getElementById('doc-spec').value;
  const available_days = document.getElementById('doc-days').value.trim();
  const bio            = document.getElementById('doc-bio').value.trim();
  if (!full_name || !available_days) return showAlert(alertEl, 'Name and available days are required.');
  try {
    await API.addDoctor({ full_name, specialization, available_days, bio });
    showAlert(alertEl, 'Doctor added successfully!', 'success');
    document.getElementById('doc-name').value = '';
    document.getElementById('doc-days').value = '';
    document.getElementById('doc-bio').value  = '';
    loadAdminDoctors();
    populateAdminDoctorDropdown();
  } catch (e) { showAlert(alertEl, e.message); }
}

async function doDeleteDoctor(id) {
  if (!confirm('Remove this doctor? All their slots will also be deleted.')) return;
  try {
    await API.deleteDoctor(id);
    loadAdminDoctors();
  } catch (e) { alert(e.message); }
}

async function doAddSlot() {
  const alertEl   = document.getElementById('add-slot-alert');
  const doctor_id = document.getElementById('slot-doctor-id').value;
  const slot_date = document.getElementById('slot-date').value;
  const slot_time = document.getElementById('slot-time').value;
  if (!doctor_id) return showAlert(alertEl, 'Please select a doctor.');
  if (!slot_date) return showAlert(alertEl, 'Please select a date.');
  if (!slot_time) return showAlert(alertEl, 'Please select a time.');
  try {
    await API.addSlot(doctor_id, { slot_date, slot_time });
    showAlert(alertEl, 'Slot added successfully!', 'success');
    document.getElementById('slot-date').value = '';
    document.getElementById('slot-time').value = '';
  } catch (e) { showAlert(alertEl, e.message); }
}

function openStatusModal(apptId, currentStatus) {
  document.getElementById('modal-appt-id').value    = apptId;
  document.getElementById('modal-status-val').value = currentStatus;
  document.getElementById('modal-notes').value      = '';
  document.getElementById('modal-status').classList.add('open');
}

function openPrescriptionModal(apptId) {
  document.getElementById('rx-appt-id').value    = apptId;
  document.getElementById('rx-medication').value = '';
  document.getElementById('rx-dosage').value     = '';
  document.getElementById('rx-duration').value   = '';
  document.getElementById('modal-prescription').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

async function doUpdateStatus() {
  const id     = document.getElementById('modal-appt-id').value;
  const status = document.getElementById('modal-status-val').value;
  const notes  = document.getElementById('modal-notes').value.trim();
  try {
    await API.updateStatus(id, { status, notes });
    closeModal('modal-status');
    loadAdminAppointments();
  } catch (e) { alert(e.message); }
}

async function doAddPrescription() {
  const id         = document.getElementById('rx-appt-id').value;
  const medication = document.getElementById('rx-medication').value.trim();
  const dosage     = document.getElementById('rx-dosage').value.trim();
  const duration   = document.getElementById('rx-duration').value.trim();
  if (!medication || !dosage || !duration) return alert('All fields are required.');
  try {
    await API.addPrescription(id, { medication, dosage, duration });
    alert('Prescription saved!');
    closeModal('modal-prescription');
  } catch (e) { alert(e.message); }
}

async function doLogin() {
  const alertEl  = document.getElementById('login-alert');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAlert(alertEl, 'Email and password are required.');
  try {
    await API.login({ email, password });
    updateNav();
    navigate(API.isAdmin() ? 'admin' : 'home');
  } catch (e) { showAlert(alertEl, e.message); }
}

async function doRegister() {
  const alertEl      = document.getElementById('register-alert');
  const full_name    = document.getElementById('reg-name').value.trim();
  const email        = document.getElementById('reg-email').value.trim();
  const admission_no = document.getElementById('reg-admission').value.trim();
  const phone        = document.getElementById('reg-phone').value.trim();
  const password     = document.getElementById('reg-password').value;
  if (!full_name || !email || !admission_no || !password)
    return showAlert(alertEl, 'Please fill in all required fields.');
  try {
    await API.register({ full_name, email, admission_no, phone, password });
    showAlert(alertEl, 'Account created! Please login.', 'success');
    setTimeout(() => navigate('login'), 1500);
  } catch (e) { showAlert(alertEl, e.message); }
}

function switchTab(panelId, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');
  btn.classList.add('active');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('open');
  });
});

updateNav();
navigate('home');