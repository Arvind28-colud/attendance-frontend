import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOTP, verifyOTP, resetPassword } from '../api'
import { ArrowLeft, Mail, Key, Lock } from 'lucide-react'

export default function ResetPage({ showToast }) {
  const [step, setStep]     = useState(1)
  const [email, setEmail]   = useState('')
  const [role, setRole]     = useState('student')
  const [otp, setOtp]       = useState('')
  const [pass, setPass]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSendOTP = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await sendOTP({ email, role })
      showToast('OTP sent to your email ✅', 'success')
      setStep(2)
    } catch (err) { showToast(err.response?.data?.detail || 'Failed ❌', 'error') }
    setLoading(false)
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await verifyOTP({ email, otp })
      showToast('OTP verified ✅', 'success')
      setStep(3)
    } catch (err) { showToast(err.response?.data?.detail || 'Invalid OTP ❌', 'error') }
    setLoading(false)
  }

  const handleReset = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await resetPassword({ email, otp, new_password: pass })
      showToast('Password reset successfully ✅', 'success')
      navigate('/')
    } catch (err) { showToast(err.response?.data?.detail || 'Failed ❌', 'error') }
    setLoading(false)
  }

  const steps = [{ icon: <Mail size={18}/>, label: 'Email' }, { icon: <Key size={18}/>, label: 'OTP' }, { icon: <Lock size={18}/>, label: 'Reset' }]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--bg)' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 420 }}>
        <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ marginBottom: 24 }}>
          <ArrowLeft size={16}/> Back to Login
        </button>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step > i + 1 ? 'var(--green)' : step === i + 1 ? 'var(--accent)' : 'var(--surface)',
                border: `2px solid ${step >= i + 1 ? (step > i + 1 ? 'var(--green)' : 'var(--accent)') : 'var(--border)'}`,
                color: step >= i + 1 ? 'white' : 'var(--text3)',
                transition: 'all 0.3s',
              }}>
                {s.icon}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, background: step > i + 1 ? 'var(--green)' : 'var(--border)', margin: '0 8px', transition: 'all 0.3s' }}/>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 28 }}>
          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <h2 style={{ fontWeight: 800, marginBottom: 6 }}>Forgot Password</h2>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>Enter your email to receive a reset OTP</p>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Role</label>
                <select className="select-field" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>Email</label>
                <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@college.edu" required/>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                {loading ? <span className="spinner"/> : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <h2 style={{ fontWeight: 800, marginBottom: 6 }}>Enter OTP</h2>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>Check your email: <strong>{email}</strong></p>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>6-digit OTP</label>
                <input className="input-field" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength={6} required style={{ fontFamily: 'Space Mono', fontSize: 20, letterSpacing: 8, textAlign: 'center' }}/>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                {loading ? <span className="spinner"/> : 'Verify OTP'}
              </button>
              <button type="button" onClick={() => setStep(1)} style={{ width: '100%', textAlign: 'center', marginTop: 10, background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13 }}>
                Resend OTP
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleReset}>
              <h2 style={{ fontWeight: 800, marginBottom: 6 }}>New Password</h2>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>Set a new secure password</p>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>New Password</label>
                <input className="input-field" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Min 6 characters" required minLength={6}/>
              </div>
              <button type="submit" className="btn btn-success" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
                {loading ? <span className="spinner" style={{ borderTopColor: '#000' }}/> : '🔐 Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
