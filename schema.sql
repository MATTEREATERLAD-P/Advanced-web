CREATE DATABASE IF NOT EXISTS clinicqueue_db;
USE clinicqueue_db;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  admission_no VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role ENUM('student','admin') DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  available_days VARCHAR(100) NOT NULL,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  is_booked TINYINT(1) DEFAULT 0,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  doctor_id INT NOT NULL,
  slot_id INT NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES time_slots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  medication VARCHAR(200) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  duration VARCHAR(100) NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

INSERT INTO doctors (full_name, specialization, available_days, bio) VALUES
('Dr. Aisha Kamau', 'General Medicine', 'Mon,Tue,Wed,Thu,Fri', 'Senior GP with 10 years experience.'),
('Dr. James Otieno', 'Dental', 'Mon,Wed,Fri', 'Specialist in oral health and hygiene.'),
('Dr. Grace Mwangi', 'Mental Health', 'Tue,Thu', 'Counselor and psychologist for student wellness.');

INSERT INTO time_slots (doctor_id, slot_date, slot_time) VALUES
(1, CURDATE(), '08:00:00'),
(1, CURDATE(), '09:00:00'),
(1, CURDATE(), '10:00:00'),
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00:00'),
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:00:00'),
(2, CURDATE(), '09:00:00'),
(2, CURDATE(), '14:00:00'),
(3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00'),
(3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '13:00:00');