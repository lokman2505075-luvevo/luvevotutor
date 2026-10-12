'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Purchase = {
  id: string; student_id: string; amount: number
  payment_method: string; trx_id: string; created_at: string
  courses: { title: string } | null
}

export default function PaymentVerifyTable() {
  const [rows, setRows] = useState<Purchase[]>([])
  const [students, setStudents] = useState<Record<string, { full_name?: string; phone?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase
      .from('purchases')
      .select('id,student_id,amount,payment_method,trx_id,created_at,courses(title)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    const list = (data as any as Purchase[]) || []
    setRows(list)

    // শিক্ষার্থীর নাম/ফোন আলাদা query-তে (যদি profiles-এ কলাম থাকে)
    const ids = Array.from(new Set(list.map(p => p.student_id)))
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id,full_name,phone').in('id', ids)
      setStudents(Object.fromEntries((profs || []).map((p: any) => [p.id, p])))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function setStatus(id: string, status: 'paid' | 'rejected') {
    if (status === 'paid' && !confirm('trxID মিলিয়ে দেখেছেন? Paid করলে শিক্ষকের wallet-এ টাকা যাবে।')) return
    setBusyId(id)
    const { error } = await supabase.from('purchases').update({ status }).eq('id', id)
    if (error) alert('সমস্যা হয়েছে: ' + error.message)
    setBusyId(null); load()
  }

  if (loading) return <p>লোড হচ্ছে...</p>
  if (rows.length === 0) return <p className="text-gray-500">যাচাইয়ের অপেক্ষায় কোনো পেমেন্ট নেই।</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3">শিক্ষার্থী</th><th className="p-3">কোর্স</th>
            <th className="p-3">পরিমাণ</th><th className="p-3">মাধ্যম</th>
            <th className="p-3">trxID</th><th className="p-3">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id} className="border-b">
              <td className="p-3">
                <div>{students[p.student_id]?.full_name || p.student_id.slice(0, 8)}</div>
                <div className="text-xs text-gray-500">{students[p.student_id]?.phone}</div>
              </td>
              <td className="p-3">{p.courses?.title}</td>
              <td className="p-3">{p.amount} টাকা</td>
              <td className="p-3 uppercase">{p.payment_method}</td>
              <td className="p-3 font-mono">{p.trx_id}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  <button disabled={busyId === p.id} onClick={() => setStatus(p.id, 'paid')}
                    className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50">Paid</button>
                  <button disabled={busyId === p.id} onClick={() => setStatus(p.id, 'rejected')}
                    className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50">Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}