import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null) // 'student' | 'teacher' | 'admin'

  useEffect(() => {
    const saved = localStorage.getItem('attendance_user')
    const savedRole = localStorage.getItem('attendance_role')
    if (saved && savedRole) {
      setUser(JSON.parse(saved))
      setRole(savedRole)
    }
  }, [])

  const login = (userData, userRole) => {
    setUser(userData)
    setRole(userRole)
    localStorage.setItem('attendance_user', JSON.stringify(userData))
    localStorage.setItem('attendance_role', userRole)
  }

  const logout = () => {
    setUser(null)
    setRole(null)
    localStorage.removeItem('attendance_user')
    localStorage.removeItem('attendance_role')
  }

  return (
    <AuthContext.Provider value={{ user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
