import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getAdminStats, getDepartments, addDepartment, deleteDepartment,
  getCourses, addCourse, deleteCourse,
  getSubjects, addSubject, deleteSubject, assignTeacher, updateClasses,
  getTeachers, getStudents, getAllTimetable, addTimetable, deleteTimetable,
  getCourseAttendance, getFacultyOverview, getStudentsOverview,
  deleteTeacher, deleteStudent,
} from '../api'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { LogOut, Shield, Plus, Trash2, Users, BookOpen, LayoutDashboard, Clock, TrendingUp, Menu, X, AlertTriangle, Search } from 'lucide-react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function AdminDashboard({ showToast }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)

  const [stats, setStats]         = useState(null)
  const [depts, setDepts]         = useState([])
  const [courses, setCourses]     = useState([])
  const [subjects, setSubjects]   = useState([])
  const [teachers, setTeachers]   = useState([])
  const [students, setStudents]   = useState([])
  const [timetable, setTimetable] = useState([])
  const [courseAtt, setCourseAtt] = useState([])
  const [loading, setLoading]     = useState(true)

  const [newDept, setNewDept]     = useState('')
  const [newCourse, setNewCourse] = useState({ name: '', department_id: '' })
  const [newSubject, setNewSubject] = useState({ name: '', course_id: '', teacher_id: '', total_classes: 0, semester: 1 })
  const [newTT, setNewTT]         = useState({ subject_id: '', day: 'Monday', start_time: '09:00', end_time: '10:00' })
  const [selCourse, setSelCourse] = useState('')
  const [ttFilterCourse, setTtFilterCourse] = useState('')

  // ── Subject filters ──────────────────────────────────────
  const [subFilterCourse, setSubFilterCourse] = useState('')
  const [subFilterSem, setSubFilterSem]       = useState('')
  const [filteredSubjects, setFilteredSubjects] = useState([])
  const [subjectsLoaded, setSubjectsLoaded]   = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    loadAll()
  }, [])

  useEffect(() => {
    if (tab !== 'dashboard') {
      window.history.pushState({ adminTab: tab }, '')
    }
  }, [tab])

  useEffect(() => {
    const handlePop = (e) => {
      if (e.state?.adminTab) return
      setTab('dashboard')
      window.history.pushState({ adminTab: 'dashboard' }, '')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  // Reset subjects view when switching to subjects tab
  useEffect(() => {
    if (tab === 'subjects') {
      setSubFilterCourse('')
      setSubFilterSem('')
      setFilteredSubjects([])
      setSubjectsLoaded(false)
    }
  }, [tab])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [st, dp, co, su, te, std, tt] = await Promise.all([
        getAdminStats(), getDepartments(), getCourses(), getSubjects(),
        getTeachers(), getStudents(), getAllTimetable(),
      ])
      setStats(st.data); setDepts(dp.data); setCourses(co.data)
      setSubjects(su.data); setTeachers(te.data); setStudents(std.data)
      setTimetable(tt.data)
    } catch { showToast('Failed to load data ❌', 'error') }
    setLoading(false)
  }

  const loadCourseAtt = async (id) => {
    try {
      const res = await getCourseAttendance(id)
      setCourseAtt(res.data)
    } catch { showToast('Failed ❌', 'error') }
  }

  // ── Get filtered subjects ────────────────────────────────
  const handleGetSubjects = () => {
    if (!subFilterCourse && !subFilterSem) {
      showToast('Please select at least Course or Semester ❌', 'error')
      return
    }
    let filtered = subjects
    if (subFilterCourse) filtered = filtered.filter(s => s.course_id === parseInt(subFilterCourse))
    if (subFilterSem)    filtered = filtered.filter(s => s.semester === parseInt(subFilterSem))
    setFilteredSubjects(filtered)
    setSubjectsLoaded(true)
    if (filtered.length === 0) showToast('No subjects found for selected filters ⚠️', 'error')
  }

  const handleConfirmDelete = async () => {
    if (!confirmModal) return
    try {
      if (confirmModal.type === 'teacher') await deleteTeacher(confirmModal.id)
      if (confirmModal.type === 'student') await deleteStudent(confirmModal.id)
      showToast(`${confirmModal.name} deleted ✅`, 'success')
      loadAll()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Delete failed ❌', 'error')
    }
    setConfirmModal(null)
  }

  const handleAddDept = async (e) => {
    e.preventDefault()
    try {
      await addDepartment({ name: newDept })
      showToast('Department added ✅', 'success')
      setNewDept(''); loadAll()
    } catch (err) { showToast(err.response?.data?.detail || 'Failed ❌', 'error') }
  }

  const handleAddCourse = async (e) => {
    e.preventDefault()
    try {
      await addCourse({ name: newCourse.name, department_id: parseInt(newCourse.department_id) })
      showToast('Course added ✅', 'success')
      setNewCourse({ name: '', department_id: '' }); loadAll()
    } catch (err) { showToast(err.response?.data?.detail || 'Failed ❌', 'error') }
  }

  const handleAddSubject = async (e) => {
    e.preventDefault()
    try {
      await addSubject({
        name: newSubject.name,
        course_id: parseInt(newSubject.course_id),
        teacher_id: newSubject.teacher_id ? parseInt(newSubject.teacher_id) : null,
        total_classes: parseInt(newSubject.total_classes) || 0,
        semester: parseInt(newSubject.semester) || 1,
      })
      showToast('Subject added ✅', 'success')
      setNewSubject({ name: '', course_id: '', teacher_id: '', total_classes: 0, semester: 1 })
      loadAll()
      // Refresh filtered subjects if active
      if (subjectsLoaded) handleGetSubjects()
    } catch (err) { showToast(err.response?.data?.detail || 'Failed ❌', 'error') }
  }

  const handleAddTimetable = async (e) => {
    e.preventDefault()
    try {
      await addTimetable({
        subject_id: parseInt(newTT.subject_id),
        day: newTT.day, start_time: newTT.start_time, end_time: newTT.end_time,
      })
      showToast('Timetable slot added ✅', 'success')
      setNewTT({ subject_id: '', day: 'Monday', start_time: '09:00', end_time: '10:00' }); loadAll()
    } catch (err) { showToast(err.response?.data?.detail || 'Failed ❌', 'error') }
  }

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',   icon: <LayoutDashboard size={isMobile ? 20 : 16}/> },
    { id: 'departments', label: 'Departments',  icon: <Shield size={isMobile ? 20 : 16}/> },
    { id: 'courses',     label: 'Courses',      icon: <BookOpen size={isMobile ? 20 : 16}/> },
    { id: 'subjects',    label: 'Subjects',     icon: <BookOpen size={isMobile ? 20 : 16}/> },
    { id: 'teachers',    label: 'Teachers',     icon: <Users size={isMobile ? 20 : 16}/> },
    { id: 'students',    label: 'Students',     icon: <Users size={isMobile ? 20 : 16}/> },
    { id: 'timetable',   label: 'Timetable',    icon: <Clock size={isMobile ? 20 : 16}/> },
    { id: 'attendance',  label: 'Attendance',   icon: <TrendingUp size={isMobile ? 20 : 16}/> },
  ]

  const bottomNavItems = navItems.slice(0, 4)
  const drawerItems    = navItems.slice(4)

  const handleTabChange = (id) => {
    setTab(id)
    setSidebarOpen(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 40, height: 40 }}/>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>

      {/* ── DESKTOP SIDEBAR ── */}
      {!isMobile && (
        <aside style={{
          width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0,
          left: 0, zIndex: 200, overflowY: 'auto',
        }}>
          <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} color="#000"/>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Admin</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user?.name}</div>
              </div>
            </div>
          </div>
          <nav style={{ padding: '12px 8px', flex: 1 }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => handleTabChange(item.id)} style={{
                width: '100%', textAlign: 'left', padding: '9px 12px',
                marginBottom: 2, borderRadius: 'var(--radius2)',
                background: tab === item.id ? 'var(--accent)' : 'transparent',
                color: tab === item.id ? 'white' : 'var(--text2)',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              }}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => { logout(); navigate('/') }} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '8px 12px' }}>
              <LogOut size={14}/> Logout
            </button>
          </div>
        </aside>
      )}

      {/* ── MOBILE TOP HEADER ── */}
      {isMobile && (
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          height: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="#000"/>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Admin</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{user?.name}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { logout(); navigate('/') }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 6 }}>
              <LogOut size={18}/>
            </button>
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 6 }}>
              <Menu size={22}/>
            </button>
          </div>
        </header>
      )}

      {/* ── MOBILE DRAWER ── */}
      {isMobile && sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}/>
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 260, background: 'var(--surface)', zIndex: 500, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Menu</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={22}/></button>
            </div>
            <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
              {navItems.map(item => (
                <button key={item.id} onClick={() => handleTabChange(item.id)} style={{
                  width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 4, borderRadius: 'var(--radius2)',
                  background: tab === item.id ? 'var(--accent)' : 'transparent',
                  color: tab === item.id ? 'white' : 'var(--text2)',
                  display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600,
                }}>
                  {item.icon} {item.label}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{
        marginLeft: isMobile ? 0 : 220, flex: 1,
        padding: isMobile ? '72px 16px 80px' : '28px 24px',
        overflowY: 'auto', minWidth: 0,
      }}>

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="fade-in">
            <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, marginBottom: 20 }}>Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
              {stats && [
                { label: 'Departments', value: stats.departments, color: 'var(--yellow)' },
                { label: 'Courses',     value: stats.courses,     color: 'var(--accent2)' },
                { label: 'Subjects',    value: stats.subjects,    color: 'var(--green)' },
                { label: 'Teachers',    value: stats.teachers,    color: '#f59e0b' },
                { label: 'Students',    value: stats.students,    color: 'var(--red)' },
              ].map((s, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Overview</h3>
                {stats && (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={[
                        { name: 'Students', value: stats.students },
                        { name: 'Teachers', value: stats.teachers },
                        { name: 'Subjects', value: stats.subjects },
                        { name: 'Courses',  value: stats.courses },
                      ]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                        {['#6c63ff','#22d3a0','#ffd166','#ff4d6a'].map((c, i) => <Cell key={i} fill={c}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {navItems.slice(1).map(item => (
                    <button key={item.id} onClick={() => handleTabChange(item.id)} style={{
                      padding: '9px 12px', borderRadius: 'var(--radius2)',
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 10,
                      fontSize: 13, fontWeight: 600, textAlign: 'left',
                    }}>
                      {item.icon} Manage {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Departments */}
        {tab === 'departments' && (
          <div className="fade-in">
            <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, marginBottom: 16 }}>Departments</h1>
            <form onSubmit={handleAddDept} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <input className="input-field" value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="Department name" required style={{ flex: 1, minWidth: 0 }}/>
              <button type="submit" className="btn btn-primary"><Plus size={16}/> Add</button>
            </form>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {depts.length === 0 ? <div className="empty-state">No departments yet</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 300 }}>
                    <thead><tr><th>#</th><th>Name</th><th>Action</th></tr></thead>
                    <tbody>
                      {depts.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--text3)' }}>#{d.id}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text)' }}>{d.name}</td>
                          <td>
                            <button onClick={async () => { await deleteDepartment(d.id); showToast('Deleted ✅', 'success'); loadAll() }} className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }}>
                              <Trash2 size={13}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Courses */}
        {tab === 'courses' && (
          <div className="fade-in">
            <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, marginBottom: 16 }}>Courses</h1>
            <form onSubmit={handleAddCourse} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <input className="input-field" value={newCourse.name} onChange={e => setNewCourse(f=>({...f,name:e.target.value}))} placeholder="Course name" required style={{ flex: 1, minWidth: 140 }}/>
              <select className="select-field" value={newCourse.department_id} onChange={e => setNewCourse(f=>({...f,department_id:e.target.value}))} required style={{ flex: 1, minWidth: 140 }}>
                <option value="">Select Department</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button type="submit" className="btn btn-primary"><Plus size={16}/> Add</button>
            </form>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 380 }}>
                  <thead><tr><th>#</th><th>Course</th><th>Department</th><th>Action</th></tr></thead>
                  <tbody>
                    {courses.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--text3)' }}>#{c.id}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</td>
                        <td><span className="badge badge-purple">{c.department_name}</span></td>
                        <td>
                          <button onClick={async () => { await deleteCourse(c.id); showToast('Deleted ✅', 'success'); loadAll() }} className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }}>
                            <Trash2 size={13}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBJECTS (updated with filters) ── */}
        {tab === 'subjects' && (
          <div className="fade-in">
            <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, marginBottom: 16 }}>Subjects</h1>

            {/* Add Subject Form */}
            <form onSubmit={handleAddSubject} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 24, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              <input className="input-field" value={newSubject.name} onChange={e => setNewSubject(f=>({...f,name:e.target.value}))} placeholder="Subject name" required/>
              <select className="select-field" value={newSubject.course_id} onChange={e => setNewSubject(f=>({...f,course_id:e.target.value}))} required>
                <option value="">Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="select-field" value={newSubject.teacher_id} onChange={e => setNewSubject(f=>({...f,teacher_id:e.target.value}))}>
                <option value="">Teacher (optional)</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select className="select-field" value={newSubject.semester} onChange={e => setNewSubject(f=>({...f,semester:e.target.value}))}>
                {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
              <input className="input-field" type="number" value={newSubject.total_classes} onChange={e => setNewSubject(f=>({...f,total_classes:e.target.value}))} placeholder="Total classes" min={0}/>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'end' }}><Plus size={16}/> Add Subject</button>
            </form>

            {/* ── Filter Section ── */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={15}/> Filter Subjects
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Select Course / Group</label>
                  <select
                    className="select-field"
                    value={subFilterCourse}
                    onChange={e => { setSubFilterCourse(e.target.value); setSubjectsLoaded(false) }}
                  >
                    <option value="">All Courses</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Select Semester</label>
                  <select
                    className="select-field"
                    value={subFilterSem}
                    onChange={e => { setSubFilterSem(e.target.value); setSubjectsLoaded(false) }}
                  >
                    <option value="">All Semesters</option>
                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleGetSubjects}
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', padding: '10px 20px', whiteSpace: 'nowrap' }}
                >
                  <Search size={15}/> Get Details
                </button>
              </div>

              {/* Active filter badges */}
              {(subFilterCourse || subFilterSem) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>Active filters:</span>
                  {subFilterCourse && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(108,99,255,0.15)', color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.3)' }}>
                      {courses.find(c => c.id === parseInt(subFilterCourse))?.name}
                    </span>
                  )}
                  {subFilterSem && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,209,102,0.15)', color: 'var(--yellow)', border: '1px solid rgba(255,209,102,0.3)' }}>
                      Semester {subFilterSem}
                    </span>
                  )}
                  <button
                    onClick={() => { setSubFilterCourse(''); setSubFilterSem(''); setFilteredSubjects([]); setSubjectsLoaded(false) }}
                    style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* ── Results ── */}
            {!subjectsLoaded ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 40, textAlign: 'center' }}>
                <Search size={32} color="var(--text3)" style={{ marginBottom: 12, opacity: 0.5 }}/>
                <div style={{ color: 'var(--text3)', fontSize: 14 }}>Select filters and click <strong>Get Details</strong> to view subjects</div>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="empty-state">No subjects found for selected filters</div>
            ) : (
              <div className="fade-in">
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
                  Showing <strong style={{ color: 'var(--text)' }}>{filteredSubjects.length}</strong> subject{filteredSubjects.length !== 1 ? 's' : ''}
                  {subFilterCourse && ` in ${courses.find(c => c.id === parseInt(subFilterCourse))?.name}`}
                  {subFilterSem && ` · Semester ${subFilterSem}`}
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: 500 }}>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Course</th>
                          <th>Teacher</th>
                          <th>Sem</th>
                          <th>Classes</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubjects.map(s => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
                            <td><span className="badge badge-purple">{s.course_name}</span></td>
                            <td style={{ fontSize: 13, color: 'var(--text3)' }}>{s.teacher_name || '—'}</td>
                            <td><span className="badge badge-yellow">Sem {s.semester}</span></td>
                            <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>{s.total_classes}</td>
                            <td>
                              <button
                                onClick={async () => {
                                  await deleteSubject(s.id)
                                  showToast('Deleted ✅', 'success')
                                  await loadAll()
                                  // Re-apply filter after delete
                                  setTimeout(() => handleGetSubjects(), 300)
                                }}
                                className="btn btn-danger"
                                style={{ padding: '5px 10px', fontSize: 12 }}
                              >
                                <Trash2 size={13}/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Teachers */}
        {tab === 'teachers' && (
          <div className="fade-in">
            <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, marginBottom: 16 }}>Teachers ({teachers.length})</h1>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 400 }}>
                  <thead><tr><th>Name</th><th>Email</th><th>Qualification</th><th>Department</th><th>Action</th></tr></thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{t.name}</td>
                        <td style={{ fontSize: 13, color: 'var(--text3)' }}>{t.email}</td>
                        <td><span className="badge badge-purple">{t.qualification}</span></td>
                        <td>{t.department_name}</td>
                        <td>
                          <button onClick={() => setConfirmModal({ type: 'teacher', id: t.id, name: t.name })} className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }}>
                            <Trash2 size={13}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Students */}
        {tab === 'students' && (
          <div className="fade-in">
            <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, marginBottom: 16 }}>Students ({students.length})</h1>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 360 }}>
                  <thead><tr><th>Name</th><th>Roll No</th><th>Course</th><th>Sem</th><th>Action</th></tr></thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
                        <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 12 }}>{s.roll_no}</td>
                        <td>{s.course_name}</td>
                        <td><span className="badge badge-yellow">Sem {s.semester}</span></td>
                        <td>
                          <button onClick={() => setConfirmModal({ type: 'student', id: s.id, name: s.name })} className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }}>
                            <Trash2 size={13}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Timetable */}
        {tab === 'timetable' && (() => {
          const subCourseMap = {}
          subjects.forEach(s => { subCourseMap[s.id] = s.course_id })
          const filteredTT = ttFilterCourse
            ? timetable.filter(t => subCourseMap[t.subject_id] === parseInt(ttFilterCourse))
            : timetable
          const byDay = {}
          DAYS.forEach(d => { byDay[d] = [] })
          filteredTT.forEach(t => { if (byDay[t.day]) byDay[t.day].push(t) })
          DAYS.forEach(d => { byDay[d].sort((a, b) => a.start_time.localeCompare(b.start_time)) })
          const addableSubjects = ttFilterCourse
            ? subjects.filter(s => s.course_id === parseInt(ttFilterCourse))
            : subjects

          return (
            <div className="fade-in">
              <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, marginBottom: 6 }}>Timetable</h1>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 16 }}>Filter by course to view and add slots.</p>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={15}/> Add Timetable Slot
                </div>
                <form onSubmit={handleAddTimetable} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  <div style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Course (filter)</label>
                    <select className="select-field" value={ttFilterCourse} onChange={e => { setTtFilterCourse(e.target.value); setNewTT(f => ({ ...f, subject_id: '' })) }}>
                      <option value="">All courses</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Subject *</label>
                    <select className="select-field" value={newTT.subject_id} onChange={e => setNewTT(f => ({ ...f, subject_id: e.target.value }))} required>
                      <option value="">Select subject</option>
                      {addableSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Day *</label>
                    <select className="select-field" value={newTT.day} onChange={e => setNewTT(f => ({ ...f, day: e.target.value }))}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Start *</label>
                    <input className="input-field" type="time" value={newTT.start_time} onChange={e => setNewTT(f => ({ ...f, start_time: e.target.value }))} required/>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>End *</label>
                    <input className="input-field" type="time" value={newTT.end_time} onChange={e => setNewTT(f => ({ ...f, end_time: e.target.value }))} required/>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <Plus size={15}/> Add
                    </button>
                  </div>
                </form>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                <button onClick={() => setTtFilterCourse('')} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: !ttFilterCourse ? 'var(--accent)' : 'var(--surface)', border: `1px solid ${!ttFilterCourse ? 'var(--accent)' : 'var(--border)'}`, color: !ttFilterCourse ? 'white' : 'var(--text3)', cursor: 'pointer' }}>All Groups</button>
                {courses.map(c => (
                  <button key={c.id} onClick={() => setTtFilterCourse(String(c.id))} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: ttFilterCourse === String(c.id) ? 'var(--accent)' : 'var(--surface)', border: `1px solid ${ttFilterCourse === String(c.id) ? 'var(--accent)' : 'var(--border)'}`, color: ttFilterCourse === String(c.id) ? 'white' : 'var(--text3)', cursor: 'pointer' }}>{c.name}</button>
                ))}
              </div>
              {filteredTT.length === 0 ? (
                <div className="empty-state card">No timetable slots yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {DAYS.filter(d => byDay[d].length > 0).map(day => (
                    <div key={day} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 14px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--accent2)' }}>{day}</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{byDay[day].length} slot{byDay[day].length > 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ minWidth: 340 }}>
                          <thead><tr><th>Subject</th><th>Course</th><th>Time</th><th></th></tr></thead>
                          <tbody>
                            {byDay[day].map(t => {
                              const course = courses.find(c => c.id === subCourseMap[t.subject_id])
                              return (
                                <tr key={t.id}>
                                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{t.subject_name}</td>
                                  <td>{course ? <span className="badge badge-purple">{course.name}</span> : '—'}</td>
                                  <td style={{ fontFamily: 'Space Mono', fontSize: 12, whiteSpace: 'nowrap' }}>{t.start_time}–{t.end_time}</td>
                                  <td>
                                    <button onClick={async () => { await deleteTimetable(t.id); showToast('Deleted ✅', 'success'); loadAll() }} className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }}>
                                      <Trash2 size={13}/>
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Attendance Report */}
        {tab === 'attendance' && (
          <div className="fade-in">
            <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, marginBottom: 16 }}>Attendance Reports</h1>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <select className="select-field" value={selCourse} onChange={e => { setSelCourse(e.target.value); if(e.target.value) loadCourseAtt(e.target.value) }} style={{ flex: 1 }}>
                <option value="">Select a course...</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {courseAtt.length > 0 && (
              <>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={courseAtt.slice(0, 20)}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} angle={-30} textAnchor="end" height={50}/>
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} domain={[0, 100]}/>
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} formatter={v => [`${v}%`]}/>
                      <Bar dataKey="percent" fill="var(--accent)" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: 480 }}>
                      <thead><tr><th>Student</th><th>Roll No</th><th>Present</th><th>Total</th><th>Attendance %</th><th>Status</th></tr></thead>
                      <tbody>
                        {courseAtt.map((s, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
                            <td style={{ fontFamily: 'Space Mono', fontSize: 12 }}>{s.roll_no}</td>
                            <td>{s.present}</td>
                            <td>{s.total_classes}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 60, height: 6, background: 'var(--bg2)', borderRadius: 3 }}>
                                  <div style={{ height: '100%', width: `${s.percent}%`, background: s.percent >= 75 ? 'var(--green)' : 'var(--red)', borderRadius: 3 }}/>
                                </div>
                                <span style={{ fontFamily: 'Space Mono', fontSize: 12, fontWeight: 700, color: s.percent >= 75 ? 'var(--green)' : 'var(--red)' }}>{s.percent}%</span>
                              </div>
                            </td>
                            <td>{s.percent >= 75 ? <span className="badge badge-green">Good</span> : <span className="badge badge-red">Low</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            {!selCourse && <div className="empty-state">Select a course to view attendance</div>}
          </div>
        )}
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', height: 60 }}>
          {bottomNavItems.map(item => (
            <button key={item.id} onClick={() => handleTabChange(item.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer',
              color: tab === item.id ? 'var(--accent)' : 'var(--text3)', fontSize: 10, fontWeight: 600,
              borderTop: tab === item.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
          <button onClick={() => setSidebarOpen(true)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer',
            color: drawerItems.some(i => i.id === tab) ? 'var(--accent)' : 'var(--text3)', fontSize: 10, fontWeight: 600,
            borderTop: drawerItems.some(i => i.id === tab) ? '2px solid var(--accent)' : '2px solid transparent',
          }}>
            <Menu size={20}/><span>More</span>
          </button>
        </nav>
      )}

      {/* ── CONFIRM DELETE MODAL ── */}
      {confirmModal && (
        <div onClick={() => setConfirmModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,77,106,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} color="var(--red)"/>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Delete {confirmModal.type === 'teacher' ? 'Teacher' : 'Student'}?</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>This action cannot be undone</div>
              </div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderRadius: 'var(--radius2)', marginBottom: 20, fontSize: 14 }}>
              <span style={{ color: 'var(--text3)' }}>Name: </span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{confirmModal.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmModal(null)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={handleConfirmDelete} className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}><Trash2 size={15}/> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}