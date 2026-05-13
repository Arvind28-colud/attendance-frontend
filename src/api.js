import axios from 'axios'

// ── Environment detection ──────────────────────────────────
// Priority: explicit env var > ngrok > local dev > Vercel (uses Render backend)
const RENDER_BACKEND = 'https://attendance-backend-2mky.onrender.com'

const isNgrok  = window.location.hostname.includes('ngrok')
const isDev    = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const isVercel = window.location.hostname.includes('vercel.app')

let BASE
if (import.meta.env.VITE_API_URL) {
  // Explicit override — highest priority
  BASE = import.meta.env.VITE_API_URL
} else if (isNgrok) {
  // Served from FastAPI via ngrok — same origin
  BASE = window.location.origin
} else if (isDev) {
  // Local dev — point directly to local FastAPI
  BASE = import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:8000'
} else if (isVercel) {
  // Deployed on Vercel — backend is on Render
  BASE = RENDER_BACKEND
} else {
  BASE = window.location.origin
}

console.log('[API] Base URL:', BASE)

const api = axios.create({
  baseURL: BASE,
  // 60 s timeout — Render free tier spins down and needs ~30 s cold-start
  timeout: 60000,
  headers: { 'ngrok-skip-browser-warning': 'true' },
  withCredentials: false,   // must be false when backend uses explicit origins list
})

// Auth
export const studentLogin    = (data) => api.post('/auth/student/login', data)
export const studentRegister = (data) => api.post('/auth/student/register', data)
export const teacherLogin    = (data) => api.post('/auth/teacher/login', data)
export const teacherRegister = (data) => api.post('/auth/teacher/register', data)
export const adminLogin      = (data) => api.post('/admin/login', data)
export const updateFace      = (data) => api.post('/auth/student/update-face', data)
export const getFace         = (roll)  => api.get(`/auth/student/face/${roll}`)

// Attendance
export const markAttendance              = (data)       => api.post('/attendance/mark', data)
export const getStudentAttendance        = (id)         => api.get(`/attendance/student/${id}`)
export const getSubjectAttendance        = (sid, subid) => api.get(`/attendance/student/${sid}/subject/${subid}`)
export const getSubjectAttendanceTeacher = (subid)      => api.get(`/attendance/subject/${subid}`)

// GPS
export const verifyGPS = (data) => api.post('/gps/verify', data)

// Reset
export const sendOTP       = (data) => api.post('/reset/send-otp', data)
export const verifyOTP     = (data) => api.post('/reset/verify-otp', data)
export const resetPassword = (data) => api.post('/reset/reset-password', data)

// Admin
export const getAdminStats       = ()   => api.get('/admin/overview/stats')
export const getDepartments      = ()   => api.get('/admin/departments')
export const addDepartment       = (d)  => api.post('/admin/department/add', d)
export const deleteDepartment    = (id) => api.delete(`/admin/department/${id}`)
export const getCourses          = ()   => api.get('/admin/courses')
export const addCourse           = (d)  => api.post('/admin/course/add', d)
export const deleteCourse        = (id) => api.delete(`/admin/course/${id}`)
export const getSubjects         = ()   => api.get('/admin/subjects')
export const addSubject          = (d)  => api.post('/admin/subject/add', d)
export const deleteSubject       = (id) => api.delete(`/admin/subject/${id}`)
export const assignTeacher       = (d)  => api.post('/admin/subject/assign-teacher', d)
export const updateClasses       = (d)  => api.post('/admin/subject/update-classes', d)
export const getTeachers         = ()   => api.get('/admin/teachers')
export const getStudents         = ()   => api.get('/admin/students')
export const deleteTeacher = (id) => api.delete(`/admin/teacher/${id}`)
export const deleteStudent = (id) => api.delete(`/admin/student/${id}`)
export const getAllTimetable      = ()   => api.get('/admin/timetable')
export const addTimetable        = (d)  => api.post('/admin/timetable/add', d)
export const deleteTimetable     = (id) => api.delete(`/admin/timetable/${id}`)
export const getCourseAttendance = (id) => api.get(`/admin/attendance/course/${id}`)
export const getFacultyOverview  = ()   => api.get('/admin/faculty/overview')
export const getStudentsOverview = ()   => api.get('/admin/students/overview')
export const getSubjectsByCourse = (id) => api.get(`/admin/subjects/course/${id}`)
export const getTodayTimetable   = ()   => api.get('/admin/timetable/today')

export default api
