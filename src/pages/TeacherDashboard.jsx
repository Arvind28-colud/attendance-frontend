import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getSubjects, getSubjectAttendanceTeacher, getStudents } from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LogOut, BookOpen, ArrowLeft, ChevronRight } from 'lucide-react'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768) // ✅ check immediately
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function TeacherDashboard({ showToast }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [subjects, setSubjects]       = useState([])
  const [selectedSub, setSelectedSub] = useState(null)
  const [subRecords, setSubRecords]   = useState([])
  const [students, setStudents]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [recLoading, setRecLoading]   = useState(false)
  const [mobileView, setMobileView]   = useState('list')

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([getSubjects(), getStudents()])
      .then(([s, st]) => { setSubjects(s.data); setStudents(st.data) })
      .catch(() => showToast('Failed to load data ❌', 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (isMobile && mobileView === 'detail') {
      window.history.pushState({ view: 'detail' }, '')
      const handlePop = () => { setMobileView('list'); setSelectedSub(null) }
      window.addEventListener('popstate', handlePop)
      return () => window.removeEventListener('popstate', handlePop)
    }
  }, [mobileView, isMobile])

  const loadSubjectRecords = async (sub) => {
    setSelectedSub(sub)
    if (isMobile) setMobileView('detail')
    setRecLoading(true)
    try {
      const res = await getSubjectAttendanceTeacher(sub.id)
      setSubRecords(res.data.records)
    } catch { showToast('Failed ❌', 'error') }
    setRecLoading(false)
  }

  const goBack = () => {
    setMobileView('list')
    setSelectedSub(null)
    setSubRecords([])
  }

  const summary = () => {
    const map = {}
    subRecords.forEach(r => {
      if (!map[r.student_id]) map[r.student_id] = { present: 0, total: 0 }
      map[r.student_id].total++
      if (r.is_present) map[r.student_id].present++
    })
    const stMap = {}
    students.forEach(s => { stMap[s.id] = s })
    return Object.entries(map).map(([sid, d]) => {
      const student = stMap[parseInt(sid)]
      const pct = selectedSub?.total_classes > 0
        ? Math.round((d.present / selectedSub.total_classes) * 100)
        : d.total > 0 ? Math.round((d.present / d.total) * 100) : 0
      return { ...student, present: d.present, pct }
    }).sort((a, b) => b.pct - a.pct)
  }

  const mySubjects    = subjects.filter(s => s.teacher_id === user?.teacher_id)
  const otherSubjects = subjects.filter(s => s.teacher_id !== user?.teacher_id)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 40, height: 40 }}/>
    </div>
  )

  const Header = ({ showBack = false }) => (
    <header style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '0 16px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showBack && (
          <button onClick={goBack} style={{
            background: 'none', border: 'none', color: 'var(--text2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 6,
          }}>
            <ArrowLeft size={20}/>
          </button>
        )}
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={18} color="#000"/>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {showBack ? selectedSub?.name : user?.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {showBack
              ? `Sem ${selectedSub?.semester} · ${selectedSub?.total_classes} classes`
              : `Teacher · ${user?.email}`}
          </div>
        </div>
      </div>
      <button onClick={() => { logout(); navigate('/') }} className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 13 }}>
        <LogOut size={15}/>
        {!isMobile && <span style={{ marginLeft: 6 }}>Logout</span>}
      </button>
    </header>
  )

  const SubjectList = () => (
    <div style={{ padding: isMobile ? '16px' : '28px 20px', maxWidth: isMobile ? '100%' : 320 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        My Subjects ({mySubjects.length})
      </div>
      {mySubjects.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 24 }}>
          No subjects assigned yet
        </div>
      ) : mySubjects.map(s => (
        <button key={s.id} onClick={() => loadSubjectRecords(s)} style={{
          width: '100%', textAlign: 'left', padding: '14px 16px', marginBottom: 8,
          borderRadius: 'var(--radius)',
          background: selectedSub?.id === s.id && !isMobile ? 'var(--accent)' : 'var(--surface)',
          border: `1px solid ${selectedSub?.id === s.id && !isMobile ? 'var(--accent)' : 'var(--border)'}`,
          color: selectedSub?.id === s.id && !isMobile ? 'white' : 'var(--text)',
          transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.name}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Sem {s.semester} · {s.total_classes} classes</div>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text3)', flexShrink: 0, marginLeft: 8 }}/>
        </button>
      ))}

      {otherSubjects.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>
            Other Subjects
          </div>
          {otherSubjects.slice(0, 5).map(s => (
            <button key={s.id} onClick={() => loadSubjectRecords(s)} style={{
              width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 6,
              borderRadius: 'var(--radius2)', background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <ChevronRight size={16} style={{ color: 'var(--text3)', flexShrink: 0, marginLeft: 8 }}/>
            </button>
          ))}
        </>
      )}
    </div>
  )

  const SubjectDetail = () => {
    const data = summary()
    const avg  = data.length > 0 ? Math.round(data.reduce((a, s) => a + s.pct, 0) / data.length) : 0

    if (recLoading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <span className="spinner" style={{ width: 36, height: 36 }}/>
      </div>
    )

    return (
      <div className="fade-in" style={{ padding: isMobile ? '16px' : '0' }}>
        {!isMobile && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontWeight: 800, fontSize: 22 }}>{selectedSub.name}</h2>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Semester {selectedSub.semester} · {selectedSub.total_classes} total classes</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Students</div>
            <div className="stat-value">{data.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{avg}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Below 75%</div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>{data.filter(s => s.pct < 75).length}</div>
          </div>
        </div>

        {data.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text2)' }}>Attendance Chart</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.slice(0, 15)}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} angle={-30} textAnchor="end" height={45}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} domain={[0, 100]}/>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} formatter={(v) => [`${v}%`]}/>
                <Bar dataKey="pct" fill="var(--accent)" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {data.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>No attendance records yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: 340 }}>
                <thead>
                  <tr><th>Student</th><th>Roll No</th><th>Present</th><th>Attendance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: 12 }}>{s.roll_no}</td>
                      <td style={{ fontSize: 13 }}>{s.present}/{selectedSub.total_classes || '?'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 6, background: 'var(--bg2)', borderRadius: 3 }}>
                            <div style={{ height: '100%', width: `${s.pct}%`, background: s.pct >= 75 ? 'var(--green)' : 'var(--red)', borderRadius: 3 }}/>
                          </div>
                          <span style={{ fontFamily: 'Space Mono', fontSize: 11, fontWeight: 700, color: s.pct >= 75 ? 'var(--green)' : 'var(--red)' }}>{s.pct}%</span>
                        </div>
                      </td>
                      <td>
                        {s.pct >= 75
                          ? <span className="badge badge-green">Good</span>
                          : <span className="badge badge-red">Low</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── MOBILE ───────────────────────────────────────────────
  if (isMobile) {
    if (mobileView === 'detail' && selectedSub) {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Header showBack={true}/>
          <SubjectDetail/>
        </div>
      )
    }
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header/>
        <SubjectList/>
      </div>
    )
  }

  // ── DESKTOP ──────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header/>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px', display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        <SubjectList/>
        <div>
          {!selectedSub ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
              <BookOpen size={48} style={{ marginBottom: 12, opacity: 0.3 }}/>
              <p style={{ fontSize: 14 }}>Select a subject to view attendance</p>
            </div>
          ) : <SubjectDetail/>}
        </div>
      </div>
    </div>
  )
}
