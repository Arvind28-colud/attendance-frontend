import { useEffect } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const icons = { success: <CheckCircle size={18}/>, error: <XCircle size={18}/>, info: <Info size={18}/> }

  return (
    <div className={`toast toast-${type}`}>
      {icons[type]}
      {message}
    </div>
  )
}
