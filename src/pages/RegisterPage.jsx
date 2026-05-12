import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { studentRegister, teacherRegister, getCourses, getDepartments } from '../api'
import { ArrowLeft, GraduationCap, BookOpen, Eye, EyeOff, Camera, CheckCircle, RefreshCw, Loader } from 'lucide-react'

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

// ── Face Camera Component ──────────────────────────────────
function FaceCapture({ onCapture, onRetake, captured }) {
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const streamRef    = useRef(null)
  const intervalRef  = useRef(null)
  const [status, setStatus]           = useState('loading') // loading | ready | detected | captured | error
  const [modelsReady, setModelsReady] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [preview, setPreview]         = useState(null) // base64 captured image

  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        setStatus('loading')
        await loadFaceApi()
        await loadModels()
        if (!active) return
        setModelsReady(true)
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('ready')
      } catch (err) {
        setStatus('error')
      }
    }
    init()
    return () => {
      active = false
      stopAll()
    }
  }, [])

  useEffect(() => {
    if (modelsReady && status === 'ready') {
      startDetection()
    }
    return () => clearInterval(intervalRef.current)
  }, [modelsReady, status])

  const stopAll = () => {
    clearInterval(intervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
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
    }, 500)
  }

  const handleCapture = async () => {
    const faceapi = window.faceapi
    const video = videoRef.current
    if (!video) return

    setStatus('loading')
    try {
      // Get face descriptor
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setStatus('ready')
        setFaceDetected(false)
        alert('No face detected clearly. Please try again.')
        return
      }

      // Capture snapshot
      const canvas = document.createElement('canvas')
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      const imgBase64 = canvas.toDataURL('image/jpeg', 0.7)

      // Store descriptor as JSON string
      const descriptorArray = Array.from(detection.descriptor)
      const faceDescriptorStr = JSON.stringify(descriptorArray)

      setPreview(imgBase64)
      setStatus('captured')
      clearInterval(intervalRef.current)
      stopAll()
      onCapture(faceDescriptorStr)
    } catch (err) {
      setStatus('ready')
      alert('Failed to capture face. Try again.')
    }
  }

  const handleRetake = () => {
    setPreview(null)
    setFaceDetected(false)
    setStatus('loading')
    onRetake()
    // Restart camera
    const init = async () => {
      try {
        await loadFaceApi()
        await loadModels()
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 } })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setStatus('ready')
        setModelsReady(true)
      } catch {
        setStatus('error')
      }
    }
    init()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Oval face frame */}
      <div style={{ position: 'relative', width: 280, height: 320 }}>
        {/* Video */}
        <video
          ref={videoRef}
          style={{
            width: 280, height: 320,
            objectFit: 'cover',
            borderRadius: '50% / 45%',
            display: status === 'captured' ? 'none' : 'block',
            transform: 'scaleX(-1)', // mirror
            background: '#111',
          }}
          muted
          playsInline
        />

        {/* Captured preview */}
        {status === 'captured' && preview && (
          <img
            src={preview}
            alt="Captured face"
            style={{
              width: 280, height: 320,
              objectFit: 'cover',
              borderRadius: '50% / 45%',
            }}
          />
        )}

        {/* Oval border overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50% / 45%',
          border: `3px solid ${
            status === 'captured' ? '#22d3a0' :
            faceDetected ? '#22d3a0' : '#6c63ff'
          }`,
          boxShadow: `0 0 0 3px ${
            status === 'captured' ? 'rgba(34,211,160,0.3)' :
            faceDetected ? 'rgba(34,211,160,0.3)' : 'rgba(108,99,255,0.3)'
          }`,
          pointerEvents: 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}/>

        {/* Loading overlay */}
        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50% / 45%',
            background: 'rgba(15,15,20,0.8)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Loader size={28} color="#6c63ff" style={{ animation: 'spin 1s linear infinite' }}/>
            <span style={{ fontSize: 12, color: '#aaa' }}>Loading camera...</span>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50% / 45%',
            background: 'rgba(15,15,20,0.9)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Camera size={28} color="#ff4d6a"/>
            <span style={{ fontSize: 12, color: '#ff4d6a', textAlign: 'center', padding: '0 16px' }}>Camera not accessible</span>
          </div>
        )}

        {/* Face detected indicator */}
        {status === 'ready' && faceDetected && (
          <div style={{
            position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
            background: '#22d3a0', color: '#000', fontSize: 11, fontWeight: 700,
            padding: '3px 12px', borderRadius: 99, whiteSpace: 'nowrap',
          }}>
            ✓ Face detected
          </div>
        )}

        {/* Captured indicator */}
        {status === 'captured' && (
          <div style={{
            position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
            background: '#22d3a0', color: '#000', fontSize: 11, fontWeight: 700,
            padding: '3px 12px', borderRadius: 99, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <CheckCircle size={12}/> Captured!
          </div>
        )}
      </div>

      {/* Instructions */}
      <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
        {status === 'loading' && 'Initializing camera & AI models...'}
        {status === 'ready' && !faceDetected && 'Position your face inside the oval'}
        {status === 'ready' && faceDetected && 'Face detected! Click Capture when ready'}
        {status === 'captured' && 'Face captured successfully!'}
        {status === 'error' && 'Could not access camera. Allow camera permission.'}
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        {status !== 'captured' ? (
          <button
            type="button"
            onClick={handleCapture}
            disabled={status !== 'ready' || !faceDetected}
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center', opacity: (status === 'ready' && faceDetected) ? 1 : 0.5 }}
          >
            <Camera size={16}/> Capture Face
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleRetake}
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <RefreshCw size={16}/> Retake
            </button>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '10px 16px', borderRadius: 'var(--radius2)',
              background: 'rgba(34,211,160,0.1)', border: '1px solid var(--green)',
              color: 'var(--green)', fontWeight: 700, fontSize: 14,
            }}>
              <CheckCircle size={16}/> Ready
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Register Page ─────────────────────────────────────
export default function RegisterPage({ showToast }) {
  const [role, setRole]         = useState('student')
  const [courses, setCourses]   = useState([])
  const [depts, setDepts]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep]         = useState('form')  // 'form' | 'face'
  const [faceData, setFaceData] = useState(null)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', roll_no: '', password: '',
    course_id: '', year: '', academic_year: '2025-2026',
    semester: 1, qualification: '', department_id: '',
  })

  useEffect(() => {
    getCourses().then(r => setCourses(r.data)).catch(() => {})
    getDepartments().then(r => setDepts(r.data)).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (role === 'student') {
      // Go to face capture step
      setStep('face')
    } else {
      handleRegister()
    }
  }

  const handleRegister = async (faceDescriptor = null) => {
    setLoading(true)
    try {
      if (role === 'student') {
        await studentRegister({
          name: form.name, email: form.email, roll_no: form.roll_no,
          password: form.password, course_id: parseInt(form.course_id),
          year: form.year, academic_year: form.academic_year,
          semester: parseInt(form.semester),
          face_data: faceDescriptor,
        })
      } else {
        await teacherRegister({
          name: form.name, email: form.email, password: form.password,
          qualification: form.qualification,
          department_id: form.department_id ? parseInt(form.department_id) : null,
        })
      }
      showToast('Registered successfully! Please login ✅', 'success')
      navigate('/')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Registration failed ❌', 'error')
      setStep('form')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 480 }}>
        <button
          onClick={() => step === 'face' ? setStep('form') : navigate('/')}
          className="btn btn-ghost"
          style={{ marginBottom: 24 }}
        >
          <ArrowLeft size={16}/> {step === 'face' ? 'Back to Form' : 'Back to Login'}
        </button>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28 }}>

          {/* ── STEP 1: FORM ── */}
          {step === 'form' && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Create Account</h2>
              <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>Register to get started</p>

              {/* Role tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--bg2)', borderRadius: 'var(--radius2)', padding: 4 }}>
                {['student', 'teacher'].map(r => (
                  <button key={r} onClick={() => setRole(r)} style={{
                    flex: 1, padding: '8px 16px', borderRadius: 8,
                    background: role === r ? 'var(--accent)' : 'transparent',
                    color: role === r ? 'white' : 'var(--text3)',
                    fontWeight: 600, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.2s',
                  }}>
                    {r === 'student' ? <GraduationCap size={16}/> : <BookOpen size={16}/>}
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Full Name *</label>
                    <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Doe" required/>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Email *</label>
                    <input className="input-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@college.edu" required/>
                  </div>
                </div>

                {role === 'student' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Roll Number *</label>
                        <input className="input-field" value={form.roll_no} onChange={e => set('roll_no', e.target.value)} placeholder="CS2024001" required/>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Semester</label>
                        <select className="select-field" value={form.semester} onChange={e => set('semester', e.target.value)}>
                          {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Course *</label>
                        <select className="select-field" value={form.course_id} onChange={e => set('course_id', e.target.value)} required>
                          <option value="">Select course</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Year</label>
                        <select className="select-field" value={form.year} onChange={e => set('year', e.target.value)}>
                          <option value="">Select year</option>
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {role === 'teacher' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Qualification</label>
                      <input className="input-field" value={form.qualification} onChange={e => set('qualification', e.target.value)} placeholder="M.Tech, Ph.D..."/>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Department</label>
                      <select className="select-field" value={form.department_id} onChange={e => set('department_id', e.target.value)}>
                        <option value="">Select dept</option>
                        {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input-field"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Min 6 characters"
                      required minLength={6}
                      style={{ paddingRight: 42 }}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', padding: 0,
                    }}>
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 13, marginTop: 4 }}>
                  {loading ? <span className="spinner"/> : role === 'student' ? 'Next → Register Face' : 'Create Account'}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: FACE CAPTURE ── */}
          {step === 'face' && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Register Your Face</h2>
              <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>
                Your face will be used to verify attendance. Make sure you're in good lighting.
              </p>

              {/* Step indicators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={14} color="white"/>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>Account Info</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: 'white', fontWeight: 700 }}>2</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>Face Registration</span>
                </div>
              </div>

              <FaceCapture
                onCapture={(descriptor) => setFaceData(descriptor)}
                onRetake={() => setFaceData(null)}
                captured={!!faceData}
              />

              {/* Register button — active only after face captured */}
              <button
                type="button"
                onClick={() => handleRegister(faceData)}
                disabled={!faceData || loading}
                className="btn btn-primary"
                style={{
                  width: '100%', justifyContent: 'center', padding: 13, marginTop: 24,
                  opacity: faceData && !loading ? 1 : 0.5,
                }}
              >
                {loading ? <span className="spinner"/> : <><CheckCircle size={16}/> Complete Registration</>}
              </button>

              <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 12 }}>
                Face data is stored securely and used only for attendance verification
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}