import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getStudentAttendance, getSubjectsByCourse, verifyGPS, markAttendance, getAllTimetable } from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { LogOut, GraduationCap, TrendingUp, AlertTriangle, Clock, MapPin, ArrowLeft, CheckCircle, XCircle, Camera, RefreshCw, Loader, ShieldCheck, ShieldX } from 'lucide-react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ── Load face-api.js from CDN ──────────────────────────────
function loadFaceApi() {
  return new Promise((resolve, reject) => {
    if (window.faceapi) return resolve()
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function loadModels() {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
  const faceapi = window.faceapi
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
}

// ── Face Verification Modal ────────────────────────────────
function FaceVerifyModal({ rollNo, storedFaceData, onSuccess, onClose }) {
  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const intervalRef = useRef(null)
  const [status, setStatus]           = useState('loading')  // loading | ready | detected | verifying | matched | failed
  const [faceDetected, setFaceDetected] = useState(false)
  const [message, setMessage]         = useState('Initializing camera & AI...')
  const [rollInput, setRollInput]     = useState('')
  const [rollConfirmed, setRollConfirmed] = useState(false)

  useEffect(() => {
    return () => stopAll()
  }, [])

  const stopAll = () => {
    clearInterval(intervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const startCamera = async () => {
    try {
      setStatus('loading')
      setMessage('Initializing camera & AI...')
      await loadFaceApi()
      await loadModels()
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('ready')
      setMessage('Position your face inside the oval')
      startDetection()
    } catch {
      setStatus('failed')
      setMessage('Could not access camera. Allow camera permission.')
    }
  }

  const startDetection = () => {
    const faceapi = window.faceapi
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !faceapi) return
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
      setFaceDetected(!!detection)
      if (detection) setMessage('Face detected! Click Verify Face')
      else setMessage('Position your face inside the oval')
    }, 500)
  }

  const handleConfirmRoll = () => {
    if (rollInput.trim().toLowerCase() !== rollNo.toLowerCase()) {
      alert('Roll number does not match. Please enter your correct roll number.')
      return
    }
    setRollConfirmed(true)
    startCamera()
  }

  const handleVerify = async () => {
    const faceapi = window.faceapi
    const video = videoRef.current
    if (!video) return

    setStatus('verifying')
    setMessage('Verifying your face...')
    clearInterval(intervalRef.current)

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setStatus('ready')
        setMessage('No face detected clearly. Try again.')
        setFaceDetected(false)
        startDetection()
        return
      }

      // Compare with stored descriptor
      const storedDescriptor = new Float32Array(JSON.parse(storedFaceData))
      const liveDescriptor   = detection.descriptor
      const distance         = faceapi.euclideanDistance(storedDescriptor, liveDescriptor)

      // threshold: 0.5 is strict, 0.6 is lenient
      if (distance < 0.55) {
        setStatus('matched')
        setMessage('Face matched! ✅')
        stopAll()
        setTimeout(() => onSuccess(), 800)
      } else {
        setStatus('failed')
        setMessage('Face not matched ❌ Please try again.')
        stopAll()
      }
    } catch {
      setStatus('failed')
      setMessage('Verification failed. Please retry.')
      stopAll()
    }
  }

  const handleRetry = () => {
    setStatus('loading')
    setFaceDetected(false)
    setMessage('Restarting camera...')
    startCamera()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 28, maxWidth: 380, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Face Verification</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* ── STEP 1: Roll number confirmation ── */}
        {!rollConfirmed && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
              First, confirm your identity by entering your roll number.
            </p>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>
              Your Roll Number *
            </label>
            <input
              className="input-field"
              value={rollInput}
              onChange={e => setRollInput(e.target.value)}
              placeholder="Enter your roll number"
              style={{ marginBottom: 14, width: '100%' }}
              onKeyDown={e => e.key === 'Enter' && handleConfirmRoll()}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                Cancel
              </button>
              <button
                onClick={handleConfirmRoll}
                className="btn btn-primary"
                disabled={!rollInput.trim()}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Confirm & Open Camera
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Face verification ── */}
        {rollConfirmed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

            {/* Oval camera */}
            <div style={{ position: 'relative', width: 240, height: 280 }}>
              <video
                ref={videoRef}
                style={{
                  width: 240, height: 280,
                  objectFit: 'cover',
                  borderRadius: '50% / 45%',
                  display: (status === 'matched' || status === 'failed' || status === 'loading') ? 'none' : 'block',
                  transform: 'scaleX(-1)',
                  background: '#111',
                }}
                muted playsInline
              />

              {/* Status overlays */}
              {(status === 'loading' || status === 'verifying') && (
                <div style={{
                  width: 240, height: 280, borderRadius: '50% / 45%',
                  background: '#111',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <Loader size={32} color="#6c63ff" style={{ animation: 'spin 1s linear infinite' }}/>
                  <span style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '0 20px' }}>
                    {status === 'verifying' ? 'Comparing faces...' : 'Loading...'}
                  </span>
                </div>
              )}

              {status === 'matched' && (
                <div style={{
                  width: 240, height: 280, borderRadius: '50% / 45%',
                  background: 'rgba(34,211,160,0.15)',
                  border: '3px solid #22d3a0',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <ShieldCheck size={48} color="#22d3a0"/>
                  <span style={{ fontSize: 13, color: '#22d3a0', fontWeight: 700 }}>Matched!</span>
                </div>
              )}

              {status === 'failed' && (
                <div style={{
                  width: 240, height: 280, borderRadius: '50% / 45%',
                  background: 'rgba(255,77,106,0.15)',
                  border: '3px solid #ff4d6a',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <ShieldX size={48} color="#ff4d6a"/>
                  <span style={{ fontSize: 13, color: '#ff4d6a', fontWeight: 700 }}>Not Matched</span>
                </div>
              )}

              {/* Oval border */}
              {(status === 'ready' || status === 'detected') && (
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50% / 45%',
                  border: `3px solid ${faceDetected ? '#22d3a0' : '#6c63ff'}`,
                  boxShadow: `0 0 0 3px ${faceDetected ? 'rgba(34,211,160,0.3)' : 'rgba(108,99,255,0.2)'}`,
                  pointerEvents: 'none',
                  transition: 'border-color 0.3s',
                }}/>
              )}

              {/* Face detected badge */}
              {(status === 'ready') && faceDetected && (
                <div style={{
                  position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
                  background: '#22d3a0', color: '#000', fontSize: 10, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap',
                }}>
                  ✓ Face detected
                </div>
              )}
            </div>

            {/* Status message */}
            <p style={{
              fontSize: 13, textAlign: 'center', marginTop: 8,
              color: status === 'matched' ? 'var(--green)' : status === 'failed' ? 'var(--red)' : 'var(--text3)',
              fontWeight: status === 'matched' || status === 'failed' ? 700 : 400,
            }}>
              {message}
            </p>

            {/* Action buttons */}
            {status === 'ready' && (
              <button
                onClick={handleVerify}
                disabled={!faceDetected}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', opacity: faceDetected ? 1 : 0.5 }}
              >
                <Camera size={16}/> Verify Face
              </button>
            )}

            {status === 'failed' && (
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button onClick={handleRetry} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <RefreshCw size={15}/> Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Student Dashboard ─────────────────────────────────
export default function StudentDashboard({ showToast }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [subjects, setSubjects]       = useState([])
  const [records, setRecords]         = useState([])
  const [stats, setStats]             = useState([])
  const [timetable, setTimetable]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [marking, setMarking]         = useState(false)
  const [gpsStatus, setGpsStatus]     = useState(null)
  const [activeTab, setActiveTab]     = useState('overview')
  const [selectedSub, setSelectedSub] = useState(null)

  // Face verification modal state
  const [showFaceModal, setShowFaceModal]   = useState(false)
  const [faceVerified, setFaceVerified]     = useState(false)
  const [storedFaceData, setStoredFaceData] = useState(null)
  const [pendingSubjectId, setPendingSubjectId] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      const [attRes, subRes, ttRes] = await Promise.all([
        getStudentAttendance(user.student_id),
        getSubjectsByCourse(user.course_id),
        getAllTimetable(),
      ])
      setRecords(attRes.data.records)
      setSubjects(subRes.data)
      const mySubIds = new Set(subRes.data.map(s => s.id))
      setTimetable(ttRes.data.filter(t => mySubIds.has(t.subject_id)))
      const subMap = {}
      subRes.data.forEach(s => { subMap[s.id] = s })
      const grouped = {}
      attRes.data.records.forEach(r => {
        if (!grouped[r.subject_id]) grouped[r.subject_id] = { present: 0, total: 0 }
        grouped[r.subject_id].total++
        if (r.is_present) grouped[r.subject_id].present++
      })
      const computed = subRes.data.map(sub => {
        const d = grouped[sub.id] || { present: 0, total: 0 }
        const totalClasses = sub.total_classes || 0
        const pct = totalClasses > 0 ? Math.round((d.present / totalClasses) * 100) : 0
        return { id: sub.id, name: sub.name, present: d.present, total: totalClasses, pct, low: pct < 75 }
      })
      setStats(computed)
    } catch { showToast('Failed to load data ❌', 'error') }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedSub) {
      window.history.pushState({ subjectOpen: true }, '')
      const handlePopState = () => { setSelectedSub(null); setGpsStatus(null); setFaceVerified(false) }
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [selectedSub])

  // When subject is selected, reset face verification
  useEffect(() => {
    setFaceVerified(false)
    setGpsStatus(null)
  }, [selectedSub])

  // ── Open face verification modal ──
  const handleOpenFaceVerify = async () => {
    // Fetch stored face data for this student
    try {
      const { default: axios } = await import('axios')
      const BASE_URL = import.meta.env.VITE_API_URL || window.location.origin
      const res = await axios.get(`${BASE_URL}/auth/student/face/${user.roll_no}`)
      setStoredFaceData(res.data.face_data)
      setPendingSubjectId(selectedSub)
      setShowFaceModal(true)
    } catch (err) {
      if (err.response?.status === 404) {
        showToast('No face registered. Please update your face in profile. ❌', 'error')
      } else {
        showToast('Failed to fetch face data ❌', 'error')
      }
    }
  }

  // ── After face verified, mark attendance ──
  const handleFaceVerified = async () => {
    setShowFaceModal(false)
    setFaceVerified(true)
    showToast('Face verified! ✅ Now click Mark Present.', 'success')
  }

  const handleMarkAttendance = async (subjectId) => {
    if (!faceVerified) {
      showToast('Please verify your face first ❌', 'error')
      return
    }
    setMarking(true)
    setGpsStatus(null)
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
      )
      const { default: axios } = await import('axios')
      const BASE_URL = import.meta.env.VITE_API_URL || window.location.origin
      const gpsRes = await axios.post(`${BASE_URL}/gps/verify`, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      })
      setGpsStatus(gpsRes.data)
      if (!gpsRes.data.verified) { showToast(gpsRes.data.message, 'error'); setMarking(false); return }
      await axios.post(`${BASE_URL}/attendance/mark`, {
        student_id: user.student_id, subject_id: subjectId,
        gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude,
        face_ok: true,
      })
      showToast('Attendance marked successfully ✅', 'success')
      setFaceVerified(false) // reset after marking
      loadData()
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || 'Failed ❌', 'error')
    }
    setMarking(false)
  }

  const getSlots = (subjectId) =>
    timetable.filter(t => t.subject_id === subjectId)
      .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))

  const isActiveNow = (start, end, day) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    if (day !== today) return false
    const now = new Date()
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const s = new Date(); s.setHours(sh, sm - 5, 0)
    const e = new Date(); e.setHours(eh, em + 5, 0)
    return now >= s && now <= e
  }

  const overallPresent = records.filter(r => r.is_present).length
  const overallTotal   = records.length
  const overallPct     = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0
  const lowSubjects    = stats.filter(s => s.low).length

  const subjectDetail  = selectedSub ? stats.find(s => s.id === selectedSub) : null
  const subjectSlots   = selectedSub ? getSlots(selectedSub) : []
  const canMarkNow     = subjectSlots.some(sl => isActiveNow(sl.start_time, sl.end_time, sl.day))
  const subjectRecords = records.filter(r => r.subject_id === selectedSub)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span className="spinner" style={{ width:40, height:40 }}/>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* Face Verify Modal */}
      {showFaceModal && storedFaceData && (
        <FaceVerifyModal
          rollNo={user.roll_no}
          storedFaceData={storedFaceData}
          onSuccess={handleFaceVerified}
          onClose={() => setShowFaceModal(false)}
        />
      )}

      {/* Header */}
      <header style={{
        background:'var(--surface)', borderBottom:'1px solid var(--border)',
        padding:'0 24px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {selectedSub && (
            <button onClick={() => { setSelectedSub(null); setGpsStatus(null); setFaceVerified(false) }}
              style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', display:'flex', alignItems:'center', gap:6, marginRight:4 }}>
              <ArrowLeft size={18}/>
            </button>
          )}
          <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <GraduationCap size={20} color="white"/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>{selectedSub ? subjectDetail?.name : user?.name}</div>
            <div style={{ fontSize:12, color:'var(--text3)', fontFamily:'Space Mono, monospace' }}>
              {selectedSub ? 'Subject Detail' : `${user?.roll_no} · Sem ${user?.semester}`}
            </div>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/') }} className="btn btn-ghost" style={{ padding:'7px 14px', fontSize:13 }}>
          <LogOut size={15}/> Logout
        </button>
      </header>

      {/* ── SUBJECT DETAIL VIEW ── */}
      {selectedSub && subjectDetail ? (
        <div className="fade-in" style={{ maxWidth:700, margin:'0 auto', padding:'28px 20px' }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
            <div className="stat-card">
              <div className="stat-label">Present</div>
              <div className="stat-value" style={{ color:'var(--green)' }}>{subjectDetail.present}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Classes</div>
              <div className="stat-value">{subjectDetail.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Attendance</div>
              <div className="stat-value" style={{ color: subjectDetail.pct >= 75 ? 'var(--green)' : 'var(--red)' }}>
                {subjectDetail.pct}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:20, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>Attendance Progress</span>
              <span style={{ fontSize:13, fontWeight:700, color: subjectDetail.pct >= 75 ? 'var(--green)' : 'var(--red)', fontFamily:'Space Mono' }}>
                {subjectDetail.pct}% {subjectDetail.pct < 75 ? '⚠️ Below 75%' : '✅ Good'}
              </span>
            </div>
            <div style={{ height:10, background:'var(--bg2)', borderRadius:5 }}>
              <div style={{ height:'100%', width:`${subjectDetail.pct}%`, background: subjectDetail.pct >= 75 ? 'var(--green)' : 'var(--red)', borderRadius:5, transition:'width 0.5s ease' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
              <span style={{ fontSize:11, color:'var(--text3)' }}>Minimum required: 75%</span>
            </div>
          </div>

          {/* Class Schedule */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:20, marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, fontWeight:700 }}>
              <Clock size={16} color="var(--accent2)"/> Class Schedule
            </div>
            {subjectSlots.length === 0 ? (
              <div style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:'16px 0' }}>No timetable set</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {subjectSlots.map((slot, i) => {
                  const live = isActiveNow(slot.start_time, slot.end_time, slot.day)
                  return (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'12px 16px', borderRadius:'var(--radius2)',
                      background: live ? 'rgba(34,211,160,0.1)' : 'var(--bg2)',
                      border:`1px solid ${live ? 'var(--green)' : 'var(--border)'}`,
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontWeight:700, color: live ? 'var(--green)' : 'var(--accent2)', minWidth:90, fontSize:13 }}>{slot.day}</span>
                        <span style={{ fontFamily:'Space Mono, monospace', fontSize:14, color:'var(--text)' }}>{slot.start_time} – {slot.end_time}</span>
                      </div>
                      {live && <span style={{ fontSize:11, fontWeight:700, color:'var(--green)', background:'rgba(34,211,160,0.15)', padding:'3px 10px', borderRadius:99 }}>🟢 LIVE NOW</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Mark Attendance Section ── */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:20, marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, fontWeight:700 }}>
              <MapPin size={16} color="var(--accent2)"/> Mark Attendance
            </div>

            {!canMarkNow && (
              <div style={{ padding:12, borderRadius:'var(--radius2)', background:'rgba(255,209,102,0.1)', border:'1px solid rgba(255,209,102,0.3)', fontSize:13, color:'var(--yellow)', marginBottom:12 }}>
                ⏰ No active class right now. You can only mark attendance during class hours (±5 min).
              </div>
            )}

            {/* Step 1: Face Verification */}
            <div style={{
              padding: 14, borderRadius: 'var(--radius2)', marginBottom: 12,
              background: faceVerified ? 'rgba(34,211,160,0.08)' : 'var(--bg2)',
              border: `1px solid ${faceVerified ? 'var(--green)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: faceVerified ? 'rgba(34,211,160,0.2)' : 'var(--bg)',
                    border: `2px solid ${faceVerified ? 'var(--green)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {faceVerified ? <CheckCircle size={16} color="var(--green)"/> : <Camera size={16} color="var(--text3)"/>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Step 1: Face Verification</div>
                    <div style={{ fontSize: 12, color: faceVerified ? 'var(--green)' : 'var(--text3)' }}>
                      {faceVerified ? 'Identity verified ✅' : 'Verify your identity with face scan'}
                    </div>
                  </div>
                </div>
                {!faceVerified && (
                  <button
                    onClick={handleOpenFaceVerify}
                    disabled={!canMarkNow}
                    className="btn btn-primary"
                    style={{ fontSize: 12, padding: '7px 14px', opacity: canMarkNow ? 1 : 0.5 }}
                  >
                    <Camera size={14}/> Scan Face
                  </button>
                )}
              </div>
            </div>

            {/* GPS Status */}
            {gpsStatus && (
              <div style={{
                padding:12, borderRadius:'var(--radius2)', marginBottom:12,
                background: gpsStatus.verified ? 'rgba(34,211,160,0.1)' : 'rgba(255,77,106,0.1)',
                border:`1px solid ${gpsStatus.verified ? 'var(--green)' : 'var(--red)'}`,
                fontSize:13, color: gpsStatus.verified ? 'var(--green)' : 'var(--red)',
                display:'flex', alignItems:'center', gap:8,
              }}>
                <MapPin size={14}/> {gpsStatus.message}
              </div>
            )}

            {/* Step 2: Mark Present button */}
            <div style={{
              padding: 14, borderRadius: 'var(--radius2)', marginBottom: 12,
              background: 'var(--bg2)',
              border: `1px solid var(--border)`,
              opacity: faceVerified ? 1 : 0.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: faceVerified ? 12 : 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--bg)', border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MapPin size={16} color="var(--text3)"/>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Step 2: Mark Present</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>GPS + attendance will be recorded</div>
                </div>
              </div>

              {faceVerified && (
                <button
                  onClick={() => handleMarkAttendance(selectedSub)}
                  disabled={marking || !faceVerified}
                  className="btn btn-success"
                  style={{ width:'100%', justifyContent:'center', padding:12, fontSize:14 }}
                >
                  {marking
                    ? <><span className="spinner" style={{ borderTopColor:'#000' }}/> Verifying GPS...</>
                    : <><MapPin size={15}/> Mark Present</>}
                </button>
              )}
            </div>

            <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center' }}>
              Must be within 200m of campus · Face + GPS verification required
            </div>
          </div>

          {/* Attendance History */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:14 }}>Attendance History</div>
            {subjectRecords.length === 0 ? (
              <div className="empty-state" style={{ padding:32 }}>No records yet</div>
            ) : (
              <table>
                <thead><tr><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {subjectRecords.slice(0,20).map((r,i) => {
                    const d = new Date(r.date)
                    return (
                      <tr key={i}>
                        <td style={{ fontFamily:'Space Mono', fontSize:12 }}>{d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                        <td style={{ fontFamily:'Space Mono', fontSize:12, color:'var(--text3)' }}>{d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
                        <td>
                          {r.is_present
                            ? <span className="badge badge-green"><CheckCircle size={11} style={{marginRight:4}}/>Present</span>
                            : <span className="badge badge-red"><XCircle size={11} style={{marginRight:4}}/>Absent</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      ) : (
        /* ── MAIN DASHBOARD ── */
        <div style={{ maxWidth:1000, margin:'0 auto', padding:'28px 20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:16, marginBottom:28 }}>
            <div className="stat-card">
              <div style={{ color:'var(--text3)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Overall Attendance</div>
              <div style={{ fontSize:36, fontWeight:800, fontFamily:'Space Mono', color: overallPct >= 75 ? 'var(--green)' : 'var(--red)' }}>{overallPct}%</div>
              <div style={{ fontSize:13, color:'var(--text3)' }}>{overallPresent} / {overallTotal} classes</div>
            </div>
            <div className="stat-card">
              <div style={{ color:'var(--text3)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Subjects</div>
              <div className="stat-value">{subjects.length}</div>
              <div style={{ fontSize:13, color:'var(--text3)' }}>enrolled · tap to view</div>
            </div>
            <div className="stat-card">
              <div style={{ color:'var(--text3)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Low Attendance</div>
              <div style={{ fontSize:36, fontWeight:800, fontFamily:'Space Mono', color: lowSubjects > 0 ? 'var(--red)' : 'var(--green)' }}>{lowSubjects}</div>
              <div style={{ fontSize:13, color:'var(--text3)' }}>below 75%</div>
            </div>
            <div className="stat-card">
              <div style={{ color:'var(--text3)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Course</div>
              <div style={{ fontSize:16, fontWeight:700, color:'var(--accent2)', marginTop:4 }}>{user?.course_name}</div>
              <div style={{ fontSize:13, color:'var(--text3)' }}>{user?.academic_year}</div>
            </div>
          </div>

          <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:4 }}>
            {[{id:'overview',label:'📊 Subjects'},{id:'chart',label:'📈 Charts'}].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                flex:1, padding:'9px 16px', borderRadius:8, fontSize:13, fontWeight:600,
                background: activeTab === t.id ? 'var(--accent)' : 'transparent',
                color: activeTab === t.id ? 'white' : 'var(--text3)', transition:'all 0.2s',
              }}>{t.label}</button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="fade-in">
              <p style={{ fontSize:13, color:'var(--text3)', marginBottom:16 }}>Tap a subject to view its schedule and mark attendance</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {stats.map(s => {
                  const slots = getSlots(s.id)
                  const liveSlot = slots.find(sl => isActiveNow(sl.start_time, sl.end_time, sl.day))
                  const todaySlots = slots.filter(sl => sl.day === new Date().toLocaleDateString('en-US',{weekday:'long'}))
                  return (
                    <button key={s.id} onClick={() => { setSelectedSub(s.id); setGpsStatus(null); setFaceVerified(false) }} style={{
                      width:'100%', textAlign:'left', padding:20,
                      background: liveSlot ? 'rgba(34,211,160,0.06)' : 'var(--surface)',
                      border:`1px solid ${liveSlot ? 'var(--green)' : 'var(--border)'}`,
                      borderRadius:'var(--radius)', cursor:'pointer', transition:'all 0.2s',
                      display:'flex', alignItems:'center', gap:16,
                    }}>
                      <div style={{
                        width:56, height:56, borderRadius:'50%', flexShrink:0,
                        background:`conic-gradient(${s.pct>=75?'#22d3a0':'#ff4d6a'} ${s.pct*3.6}deg, var(--bg2) 0deg)`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, fontFamily:'Space Mono', color: s.pct>=75?'var(--green)':'var(--red)' }}>{s.pct}%</div>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:4 }}>
                          {s.name}
                          {liveSlot && <span style={{ marginLeft:10, fontSize:11, color:'var(--green)', background:'rgba(34,211,160,0.15)', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>🟢 LIVE</span>}
                        </div>
                        <div style={{ fontSize:13, color:'var(--text3)', display:'flex', gap:16, flexWrap:'wrap' }}>
                          <span>{s.present}/{s.total} classes attended</span>
                          {todaySlots.length > 0 && <span style={{ color:'var(--accent3)', display:'flex', alignItems:'center', gap:4 }}><Clock size={12}/> Today: {todaySlots.map(sl=>`${sl.start_time}–${sl.end_time}`).join(', ')}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                        {s.low ? <span className="badge badge-red"><AlertTriangle size={11} style={{marginRight:4}}/>Low</span> : <span className="badge badge-green">Good</span>}
                        <span style={{ fontSize:18, color:'var(--text3)' }}>›</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="fade-in">
              {stats.length === 0 ? <div className="empty-state">No data yet</div> : (
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:24 }}>
                  <h3 style={{ fontWeight:700, marginBottom:20 }}>Attendance by Subject</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats} margin={{top:5,right:10,left:0,bottom:60}}>
                      <XAxis dataKey="name" tick={{fill:'var(--text3)',fontSize:12}} angle={-35} textAnchor="end"/>
                      <YAxis tick={{fill:'var(--text3)',fontSize:12}} domain={[0,100]}/>
                      <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)'}} formatter={v=>[`${v}%`,'Attendance']}/>
                      <Bar dataKey="pct" radius={[6,6,0,0]}>
                        {stats.map((s,i) => <Cell key={i} fill={s.pct>=75?'#22d3a0':'#ff4d6a'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
