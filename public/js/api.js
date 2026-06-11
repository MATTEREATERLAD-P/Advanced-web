const API = {
  getToken: () => localStorage.getItem('cq_token'),
  getUser:  () => JSON.parse(localStorage.getItem('cq_user') || 'null'),
  isLoggedIn: () => !!localStorage.getItem('cq_token'),
  isAdmin: () => API.getUser()?.role === 'admin',

  saveSession(token, user) {
    localStorage.setItem('cq_token', token);
    localStorage.setItem('cq_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('cq_token');
    localStorage.removeItem('cq_user');
  },

  async request(method, endpoint, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = API.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api${endpoint}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get:    (ep)       => API.request('GET',    ep),
  post:   (ep, body) => API.request('POST',   ep, body),
  patch:  (ep, body) => API.request('PATCH',  ep, body),
  delete: (ep)       => API.request('DELETE', ep),

  async register(data) { return API.post('/auth/register', data); },
  async login(data) {
    const res = await API.post('/auth/login', data);
    API.saveSession(res.token, res.user);
    return res;
  },
  logout() { API.clearSession(); window.location.reload(); },

  getDoctors:        ()         => API.get('/doctors'),
  getDoctorSlots:    (id)       => API.get(`/doctors/${id}/slots`),
  addDoctor:         (data)     => API.post('/doctors', data),
  addSlot:           (id, data) => API.post(`/doctors/${id}/slots`, data),
  deleteDoctor:      (id)       => API.delete(`/doctors/${id}`),

  bookAppointment:   (data)     => API.post('/appointments', data),
  getMyAppointments: ()         => API.get('/appointments/mine'),
  getAllAppointments: ()         => API.get('/appointments/all'),
  updateStatus:      (id, data) => API.patch(`/appointments/${id}/status`, data),
  cancelAppointment: (id)       => API.delete(`/appointments/${id}`),
  addPrescription:   (id, data) => API.post(`/appointments/${id}/prescriptions`, data),
  getPrescriptions:  (id)       => API.get(`/appointments/${id}/prescriptions`),
};

function showAlert(el, msg, type = 'error') {
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 5000);
}
function badge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-KE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}
function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}