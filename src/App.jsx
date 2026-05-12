import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import StudentDashboard from './pages/StudentDashboard'
import TeacherDashboard from './pages/TeacherDashboard'
import AdminDashboard   from './pages/AdminDashboard'
import ResetPage        from './pages/ResetPage'
import Toast            from './components/Toast'

function ProtectedRoute({ children, allowedRole }) {
  const { user, role } = useAuth()
  if (!user) return <Navigate to="/" replace/>
  if (allowedRole && role !== allowedRole) return <Navigate to="/" replace/>
  return children
}

function AppRoutes() {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <>
      <Routes>
        <Route path="/"        element={<LoginPage showToast={showToast}/>}/>
        <Route path="/register" element={<RegisterPage showToast={showToast}/>}/>
        <Route path="/reset"    element={<ResetPage showToast={showToast}/>}/>
        <Route path="/student"  element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard showToast={showToast}/>
          </ProtectedRoute>
        }/>
        <Route path="/teacher"  element={
          <ProtectedRoute allowedRole="teacher">
            <TeacherDashboard showToast={showToast}/>
          </ProtectedRoute>
        }/>
        <Route path="/admin"    element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard showToast={showToast}/>
          </ProtectedRoute>
        }/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>

      {/* Toast container */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)}/>
        ))}
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes/>
      </BrowserRouter>
    </AuthProvider>
  )
}
