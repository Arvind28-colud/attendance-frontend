import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getSubjects, getSubjectAttendanceTeacher, getStudents,
  addAssignment, getAssignmentsByTeacher, updateAssignment, deleteAssignment,
  addLabRecord, getLabRecordsByTeacher, updateLabRecord, deleteLabRecord,
} from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { LogOut, BookOpen, ArrowLeft, ChevronRight, Plus, Trash2, Edit2, ClipboardList, FlaskConical, X, Check } from 'lucide-react'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:28, width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}><X size={20}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function TeacherDashboard({ showToast }) {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const isMobile         = useIsMobile()

  const [subjects,    setSubjects]    = useState([])
  const [students,    setStudents]    = useState([])
  const [assignments, setAssignments] = useState([])
  const [labRecords,  setLabRecords]  = useState([])
  const [selectedSub, setSelectedSub] = useState(null)
  const [subRecords,  setSubRecords]  = useState([])

  const [loading,    setLoading]    = useState(true)
  const [recLoading, setRecLoading] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const [detailTab,  setDetailTab]  = useState('attendance')

  const [showAForm, setShowAForm] = useState(false)
  const [aForm,     setAForm]     = useState({ title:'', description:'', due_date:'' })
  const [editingA,  setEditingA]  = useState(null)
  const [aSaving,   setASaving]   = useState(false)

  const [showLForm, setShowLForm] = useState(false)
  const [lForm,     setLForm]     = useState({ title:'', description:'', due_date:'' })
  const [editingL,  setEditingL]  = useState(null)
  const [lSaving,   setLSaving]   = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      getSubjects(),
      getStudents(),
      getAssignmentsByTeacher(user.teacher_id),
      getLabRecordsByTeacher(user.teacher_id),
    ])
      .then(([s, st, a, l]) => {
        setSubjects(s.data)
        setStudents(st.data)
        setAssignments(a.data)
        setLabRecords(l.data)
      })
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
    setDetailTab('attendance')
    if (isMobile) setMobileView('detail')
    setRecLoading(true)
    try {
      const res = await getSubjectAttendanceTeacher(sub.id)
      setSubRecords(res.data.records)
    } catch { showToast('Failed ❌', 'error') }
    setRecLoading(false)
  }

  const goBack = () => { setMobileView('list'); setSelectedSub(null); setSubRecords([]) }

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
  const subAssignments = selectedSub ? assignments.filter(a => a.subject_id === selectedSub.id) : []
  const subLabRecord   = selectedSub ? labRecords.find(l => l.subject_id === selectedSub.id) : null

  // ── Assignment CRUD ──────────────────────────────────
  const openAddAssignment = () => { setEditingA(null); setAForm({ title:'', description:'', due_date:'' }); setShowAForm(true) }
  const openEditAssignment = (a) => { setEditingA(a); setAForm({ title:a.title, description:a.description, due_date:a.due_date }); setShowAForm(true) }
  const saveAssignment = async () => {
    if (!aForm.title.trim() || !aForm.due_date) { showToast('Title and due date required ❌', 'error'); return }
    setASaving(true)
    try {
      if (editingA) {
        await updateAssignment(editingA.id, aForm)
        setAssignments(prev => prev.map(a => a.id === editingA.id ? { ...a, ...aForm } : a))
        showToast('Assignment updated ✅', 'success')
      } else {
        const res = await addAssignment({ ...aForm, subject_id: selectedSub.id, teacher_id: user.teacher_id })
        setAssignments(prev => [...prev, { id: res.data.id, subject_id: selectedSub.id, subject_name: selectedSub.name, teacher_id: user.teacher_id, teacher_name: user.name, ...aForm, created_at: new Date().toISOString() }])
        showToast('Assignment added ✅', 'success')
      }
      setShowAForm(false)
    } catch (e) { showToast(e?.response?.data?.detail || 'Failed ❌', 'error') }
    setASaving(false)
  }
  const handleDeleteAssignment = async (id) => {
    if (!confirm('Delete this assignment?')) return
    try { await deleteAssignment(id); setAssignments(prev => prev.filter(a => a.id !== id)); showToast('Deleted ✅', 'success') }
    catch { showToast('Failed ❌', 'error') }
  }

  // ── Lab Record CRUD ──────────────────────────────────
  const openAddLabRecord = () => { setEditingL(null); setLForm({ title:'', description:'', due_date:'' }); setShowLForm(true) }
  const openEditLabRecord = (l) => { setEditingL(l); setLForm({ title:l.title, description:l.description, due_date:l.due_date }); setShowLForm(true) }
  const saveLabRecord = async () => {
    if (!lForm.title.trim() || !lForm.due_date) { showToast('Title and due date required ❌', 'error'); return }
    setLSaving(true)
    try {
      if (editingL) {
        await updateLabRecord(editingL.id, lForm)
        setLabRecords(prev => prev.map(l => l.id === editingL.id ? { ...l, ...lForm } : l))
        showToast('Lab record updated ✅', 'success')
      } else {
        const res = await addLabRecord({ ...lForm, subject_id: selectedSub.id, teacher_id: user.teacher_id, semester: selectedSub.semester })
        setLabRecords(prev => [...prev, { id: res.data.id, subject_id: selectedSub.id, subject_name: selectedSub.name, teacher_id: user.teacher_id, semester: selectedSub.semester, ...lForm, created_at: new Date().toISOString() }])
        showToast('Lab record added ✅', 'success')
      }
      setShowLForm(false)
    } catch (e) { showToast(e?.response?.data?.detail || 'Failed ❌', 'error') }
    setLSaving(false)
  }
  const handleDeleteLabRecord = async (id) => {
    if (!confirm('Delete this lab record?')) return
    try { await deleteLabRecord(id); setLabRecords(prev => prev.filter(l => l.id !== id)); showToast('Deleted ✅', 'success') }
    catch { showToast('Failed ❌', 'error') }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span className="spinner" style={{ width:40, height:40 }}/>
    </div>
  )

  const Header = ({ showBack = false }) => (
    <header style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 16px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {showBack && (
          <button onClick={goBack} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', display:'flex', alignItems:'center', padding:6 }}>
            <ArrowLeft size={20}/>
          </button>
        )}
        <div style={{ width:34, height:34, borderRadius:10, background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BookOpen size={18} color="#000"/>
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>{showBack ? selectedSub?.name : user?.name}</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>{showBack ? `Sem ${selectedSub?.semester} · ${selectedSub?.total_classes} classes` : `Teacher · ${user?.email}`}</div>
        </div>
      </div>
      <button onClick={() => { logout(); navigate('/') }} className="btn btn-ghost" style={{ padding:'7px 12px', fontSize:13 }}>
        <LogOut size={15}/>{!isMobile && <span style={{ marginLeft:6 }}>Logout</span>}
      </button>
    </header>
  )

  const SubjectList = () => (
    <div style={{ padding: isMobile ? '16px' : '28px 20px', maxWidth: isMobile ? '100%' : 320 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>My Subjects ({mySubjects.length})</div>
      {mySubjects.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontSize:13, color:'var(--text3)', textAlign:'center', padding:24 }}>No subjects assigned yet</div>
      ) : mySubjects.map(s => (
        <button key={s.id} onClick={() => loadSubjectRecords(s)} style={{
          width:'100%', textAlign:'left', padding:'14px 16px', marginBottom:8, borderRadius:'var(--radius)',
          background: selectedSub?.id === s.id && !isMobile ? 'var(--accent)' : 'var(--surface)',
          border:`1px solid ${selectedSub?.id === s.id && !isMobile ? 'var(--accent)' : 'var(--border)'}`,
          color: selectedSub?.id === s.id && !isMobile ? 'white' : 'var(--text)',
          transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
            <div style={{ fontSize:12, opacity:0.7, marginTop:2 }}>Sem {s.semester} · {s.total_classes} classes</div>
          </div>
          <ChevronRight size={18} style={{ color:'var(--text3)', flexShrink:0, marginLeft:8 }}/>
        </button>
      ))}
      {otherSubjects.length > 0 && (
        <>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', margin:'20px 0 10px' }}>Other Subjects</div>
          {otherSubjects.slice(0, 5).map(s => (
            <button key={s.id} onClick={() => loadSubjectRecords(s)} style={{
              width:'100%', textAlign:'left', padding:'12px 14px', marginBottom:6, borderRadius:'var(--radius2)',
              background:'transparent', border:'1px solid var(--border)', color:'var(--text2)', fontSize:13,
              display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
              <ChevronRight size={16} style={{ color:'var(--text3)', flexShrink:0, marginLeft:8 }}/>
            </button>
          ))}
        </>
      )}
    </div>
  )

  const SubjectDetail = () => {
    const data      = summary()
    const avg       = data.length > 0 ? Math.round(data.reduce((a, s) => a + s.pct, 0) / data.length) : 0
    const attending = data.filter(s => s.pct >= 75).length

    if (recLoading) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <span className="spinner" style={{ width:36, height:36 }}/>
      </div>
    )

    return (
      <div className="fade-in" style={{ padding: isMobile ? '16px' : '0' }}>
        {!isMobile && (
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontWeight:800, fontSize:22 }}>{selectedSub.name}</h2>
            <p style={{ color:'var(--text3)', fontSize:13 }}>Semester {selectedSub.semester} · {selectedSub.total_classes} total classes</p>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:16 }}>
          <div className="stat-card">
            <div className="stat-label">Students</div>
            <div className="stat-value">{data.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Attendance</div>
            <div className="stat-value" style={{ color:'var(--green)', lineHeight:1.2 }}>
              {avg}%
              <span style={{ display:'block', fontSize:11, fontWeight:500, color:'var(--text3)', marginTop:3 }}>
                {attending}/{data.length} attending
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Assignments</div>
            <div className="stat-value" style={{ color:'var(--accent)' }}>{subAssignments.length}/4</div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:4 }}>
          {[
            { id:'attendance',  label:'📋 Attendance'  },
            { id:'assignments', label:'📝 Assignments' },
            { id:'labrecords',  label:'🧪 Lab Record'  },
          ].map(t => (
            <button key={t.id} onClick={() => setDetailTab(t.id)} style={{
              flex:1, padding:'8px 6px', borderRadius:8, fontSize:12, fontWeight:600,
              background: detailTab === t.id ? 'var(--accent)' : 'transparent',
              color: detailTab === t.id ? 'white' : 'var(--text3)',
              transition:'all 0.2s', border:'none', cursor:'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── ATTENDANCE TAB ── */}
        {detailTab === 'attendance' && (
          <div>
            {data.length > 0 && (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16, marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:12, color:'var(--text2)' }}>Attendance Chart</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.slice(0, 15)}>
                    <XAxis dataKey="name" tick={{ fontSize:10, fill:'var(--text3)' }} angle={-30} textAnchor="end" height={45}/>
                    <YAxis tick={{ fontSize:11, fill:'var(--text3)' }} domain={[0, 100]}/>
                    <Tooltip contentStyle={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)' }} formatter={v => [`${v}%`]}/>
                    <Bar dataKey="pct" fill="var(--accent)" radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
              {data.length === 0 ? (
                <div className="empty-state" style={{ padding:40 }}>No attendance records yet</div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ minWidth:340 }}>
                    <thead>
                      <tr><th>Student</th><th>Roll No</th><th>Present</th><th>Attendance</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {data.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight:600, color:'var(--text)' }}>{s.name}</td>
                          <td style={{ fontFamily:'Space Mono, monospace', fontSize:12 }}>{s.roll_no}</td>
                          <td style={{ fontSize:13 }}>{s.present}/{selectedSub.total_classes || '?'}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ width:50, height:6, background:'var(--bg2)', borderRadius:3 }}>
                                <div style={{ height:'100%', width:`${s.pct}%`, background: s.pct >= 75 ? 'var(--green)' : 'var(--red)', borderRadius:3 }}/>
                              </div>
                              <span style={{ fontFamily:'Space Mono', fontSize:11, fontWeight:700, color: s.pct >= 75 ? 'var(--green)' : 'var(--red)' }}>{s.pct}%</span>
                            </div>
                          </td>
                          <td>{s.pct >= 75 ? <span className="badge badge-green">Good</span> : <span className="badge badge-red">Low</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ASSIGNMENTS TAB ── */}
        {detailTab === 'assignments' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:13, color:'var(--text3)' }}>Max 4 assignments per subject</div>
              {subAssignments.length < 4 && (
                <button onClick={openAddAssignment} className="btn btn-primary" style={{ padding:'7px 14px', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                  <Plus size={15}/> Add
                </button>
              )}
            </div>
            {subAssignments.length === 0 ? (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:40, textAlign:'center', color:'var(--text3)' }}>
                <ClipboardList size={36} style={{ opacity:0.3, marginBottom:10 }}/>
                <p style={{ fontSize:13 }}>No assignments yet. Click Add to create one.</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {subAssignments.map((a, i) => (
                  <div key={a.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Assignment {i + 1}: {a.title}</div>
                        {a.description && <div style={{ fontSize:13, color:'var(--text3)', marginBottom:6 }}>{a.description}</div>}
                        <span style={{ fontSize:12, color:'var(--accent3)', background:'rgba(99,102,241,0.1)', padding:'3px 10px', borderRadius:99 }}>📅 Due: {a.due_date}</span>
                      </div>
                      <div style={{ display:'flex', gap:8, marginLeft:12 }}>
                        <button onClick={() => openEditAssignment(a)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}><Edit2 size={15}/></button>
                        <button onClick={() => handleDeleteAssignment(a.id)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer' }}><Trash2 size={15}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LAB RECORDS TAB ── */}
        {detailTab === 'labrecords' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:13, color:'var(--text3)' }}>1 lab record per subject per semester</div>
              {!subLabRecord && (
                <button onClick={openAddLabRecord} className="btn btn-primary" style={{ padding:'7px 14px', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                  <Plus size={15}/> Add
                </button>
              )}
            </div>
            {!subLabRecord ? (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:40, textAlign:'center', color:'var(--text3)' }}>
                <FlaskConical size={36} style={{ opacity:0.3, marginBottom:10 }}/>
                <p style={{ fontSize:13 }}>No lab record for this subject yet.</p>
              </div>
            ) : (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'18px 20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>{subLabRecord.title}</div>
                    {subLabRecord.description && <div style={{ fontSize:13, color:'var(--text3)', marginBottom:10 }}>{subLabRecord.description}</div>}
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, color:'var(--accent3)', background:'rgba(99,102,241,0.1)', padding:'3px 10px', borderRadius:99 }}>📅 Due: {subLabRecord.due_date}</span>
                      <span style={{ fontSize:12, color:'var(--text3)', background:'var(--bg2)', padding:'3px 10px', borderRadius:99 }}>Sem {subLabRecord.semester}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, marginLeft:12 }}>
                    <button onClick={() => openEditLabRecord(subLabRecord)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}><Edit2 size={15}/></button>
                    <button onClick={() => handleDeleteLabRecord(subLabRecord.id)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer' }}><Trash2 size={15}/></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Assignment modal ─────────────────────────────────
  const AssignmentForm = () => (
    <Modal title={editingA ? 'Edit Assignment' : 'Add Assignment'} onClose={() => setShowAForm(false)}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5 }}>Title *</label>
          <input className="input-field" value={aForm.title} onChange={e => setAForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Assignment 1 – Data Structures" style={{ width:'100%' }}/>
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5 }}>Description</label>
          <textarea className="input-field" value={aForm.description} onChange={e => setAForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional instructions..." rows={3} style={{ width:'100%', resize:'vertical' }}/>
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5 }}>Due Date *</label>
          <input className="input-field" type="date" value={aForm.due_date} onChange={e => setAForm(p => ({ ...p, due_date: e.target.value }))} style={{ width:'100%' }}/>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button onClick={() => setShowAForm(false)} className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button onClick={saveAssignment} disabled={aSaving} className="btn btn-primary" style={{ flex:1, justifyContent:'center', display:'flex', alignItems:'center', gap:6 }}>
            {aSaving ? '...' : <><Check size={14}/>{editingA ? 'Update' : 'Add'}</>}
          </button>
        </div>
      </div>
    </Modal>
  )

  // ── Lab Record modal ─────────────────────────────────
  const LabRecordForm = () => (
    <Modal title={editingL ? 'Edit Lab Record' : 'Add Lab Record'} onClose={() => setShowLForm(false)}>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5 }}>Title *</label>
          <input className="input-field" value={lForm.title} onChange={e => setLForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Lab Record – Network Programming" style={{ width:'100%' }}/>
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5 }}>Description</label>
          <textarea className="input-field" value={lForm.description} onChange={e => setLForm(p => ({ ...p, description: e.target.value }))} placeholder="What students need to submit..." rows={3} style={{ width:'100%', resize:'vertical' }}/>
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--text3)', display:'block', marginBottom:5 }}>Due Date *</label>
          <input className="input-field" type="date" value={lForm.due_date} onChange={e => setLForm(p => ({ ...p, due_date: e.target.value }))} style={{ width:'100%' }}/>
        </div>
        <div style={{ fontSize:12, color:'var(--text3)', background:'var(--bg2)', padding:'8px 12px', borderRadius:8 }}>
          📌 Semester {selectedSub?.semester} — only one lab record per subject per semester
        </div>
        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button onClick={() => setShowLForm(false)} className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }}>Cancel</button>
          <button onClick={saveLabRecord} disabled={lSaving} className="btn btn-primary" style={{ flex:1, justifyContent:'center', display:'flex', alignItems:'center', gap:6 }}>
            {lSaving ? '...' : <><Check size={14}/>{editingL ? 'Update' : 'Add'}</>}
          </button>
        </div>
      </div>
    </Modal>
  )

  // ── Mobile ───────────────────────────────────────────
  if (isMobile) {
    if (mobileView === 'detail' && selectedSub) return (
      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
        <Header showBack={true}/>
        <SubjectDetail/>
        {showAForm && <AssignmentForm/>}
        {showLForm  && <LabRecordForm/>}
      </div>
    )
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
        <Header/><SubjectList/>
      </div>
    )
  }

  // ── Desktop ──────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px', display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }}>
        <SubjectList/>
        <div>
          {!selectedSub ? (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', height:300, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text3)' }}>
              <BookOpen size={48} style={{ marginBottom:12, opacity:0.3 }}/>
              <p style={{ fontSize:14 }}>Select a subject to view details</p>
            </div>
          ) : <SubjectDetail/>}
        </div>
      </div>
      {showAForm && <AssignmentForm/>}
      {showLForm  && <LabRecordForm/>}
    </div>
  )
}
