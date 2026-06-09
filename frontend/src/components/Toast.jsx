import { CheckCircle2, XCircle } from 'lucide-react'

export default function Toast({ notice }) {
  const good = notice.type === 'success'
  return (
    <div className={`toast ${good ? 'toast-good' : 'toast-bad'}`}>
      {good ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
      <span>{notice.text}</span>
    </div>
  )
}
