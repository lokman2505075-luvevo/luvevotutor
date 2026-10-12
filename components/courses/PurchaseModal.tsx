'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PurchaseModal({ course, userId, onClose, onDone }: {
  course: { id: string; title: string; price: number }
  userId: string; onClose: () => void; onDone: () => void
}) {
  const [method, setMethod] = useState('bkash')
  const [trx, setTrx] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (trx.trim().length < 6) return setErr('সঠিক trxID দিন')
    setBusy(true); setErr('')
    const { error } = await supabase.from('purchases').insert({
      course_id: course.id, student_id: userId, amount: course.price,
      payment_method: method, trx_id: trx.trim(), status: 'pending',
    })
    setBusy(false)
    if (error) return setErr(error.code === '23505' ? 'আপনি আগেই অনুরোধ করেছেন' : 'সমস্যা হয়েছে, আবার চেষ্টা করুন')
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6">
        <h3 className="text-xl font-bold">{course.title}</h3>
        <p className="mt-1 text-lg">মূল্য: <b>{course.price} টাকা</b></p>

        <div className="mt-4 rounded bg-sky-50 p-3 text-sm">
          ১. নিচের নম্বরে <b>{course.price} টাকা Send Money</b> করুন<br />
          <b className="text-lg">{process.env.NEXT_PUBLIC_PAYMENT_NUMBER}</b><br />
          ২. পেমেন্টের trxID নিচে লিখে সাবমিট করুন<br />
          ৩. যাচাই হলে কোর্সটি আনলক হবে
        </div>

        <select value={method} onChange={e => setMethod(e.target.value)} className="mt-4 w-full rounded border p-2">
          <option value="bkash">bKash</option>
          <option value="nagad">Nagad</option>
          <option value="rocket">Rocket</option>
        </select>
        <input value={trx} onChange={e => setTrx(e.target.value)} placeholder="trxID"
          className="mt-3 w-full rounded border p-2" />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded border px-4 py-2">বাতিল</button>
          <button onClick={submit} disabled={busy} className="rounded bg-sky-600 px-4 py-2 text-white disabled:opacity-50">
            {busy ? 'পাঠানো হচ্ছে...' : 'সাবমিট'}
          </button>
        </div>
      </div>
    </div>
  )
}