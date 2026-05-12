import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { studentLogin, teacherLogin, adminLogin } from '../api'
import { GraduationCap, BookOpen, Shield, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function LoginPage({ showToast }) {
  const [role, setRole]         = useState('student')
  const [rollNo, setRollNo]     = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let res
      if (role === 'student') {
        res = await studentLogin({ roll_no: rollNo, password })
        login(res.data, 'student')
        navigate('/student')
      } else if (role === 'teacher') {
        res = await teacherLogin({ email, password })
        login(res.data, 'teacher')
        navigate('/teacher')
      } else {
        res = await adminLogin({ email, password })
        login(res.data, 'admin')
        navigate('/admin')
      }
      showToast(res.data.message, 'success')
    } catch (err) {
      console.log('Full error:', err)
      console.log('Response:', err.response)
      showToast(err.response?.data?.detail || 'Login failed ❌', 'error')
    }
    setLoading(false)
  }

  const roles = [
    { id: 'student', label: 'Student',  icon: <GraduationCap size={22}/>, color: '#6c63ff' },
    { id: 'teacher', label: 'Teacher',  icon: <BookOpen size={22}/>,      color: '#22d3a0' },
    { id: 'admin',   label: 'Admin',    icon: <Shield size={22}/>,        color: '#ffd166' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}/>

      <div className="fade-in" style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--accent), #9c94ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(108,99,255,0.3)',
          }}>
            <GraduationCap size={32} color="white"/>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Attendance System
          </h1>
          <p style={{ color: 'var(--text3)', marginTop: 6, fontSize: 14 }}>
            Sign in to your account
          </p>
        </div>

        {/* Role Selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {roles.map(r => (
            <button key={r.id}
              onClick={() => setRole(r.id)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 'var(--radius)',
                background: role === r.id ? r.color : 'var(--surface)',
                border: `1px solid ${role === r.id ? r.color : 'var(--border)'}`,
                color: role === r.id ? (r.id === 'admin' ? '#000' : 'white') : 'var(--text2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600,
                transform: role === r.id ? 'scale(1.03)' : 'scale(1)',
                transition: 'all 0.2s ease',
                boxShadow: role === r.id ? `0 4px 20px ${r.color}40` : 'none',
              }}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 28,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {role === 'student' ? (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Roll Number
              </label>
              <input
                className="input-field"
                placeholder="e.g. CS2024001"
                value={rollNo}
                onChange={e => setRollNo(e.target.value)}
                required
              />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Password</label>
              <button type="button" onClick={() => navigate('/reset')}
                style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none' }}>
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text3)',
                }}>
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 15, marginTop: 4 }}>
            {loading ? <span className="spinner"/> : <>Sign In <ArrowRight size={16}/></>}
          </button>
        </form>

        {/* Register link for students/teachers */}
        {role !== 'admin' && (
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text3)' }}>
            Don't have an account?{' '}
            <button onClick={() => navigate('/register')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>
              Register
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
