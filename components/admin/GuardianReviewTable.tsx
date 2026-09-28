'use client'

import { useEffect, useState } from 'react'
import { Check, Star, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

type PendingReview = { id: string; name: string; review: string; rating: number; created_at: string }

export default function GuardianReviewTable() {
  const [rows, setRows] = useState<PendingReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function loadReviews() {
      const { data, error: queryError } = await supabase.from('guardian_reviews').select('id, name, review, rating, created_at').eq('is_approved', false).order('created_at', { ascending: false })
      if (queryError) setError('পেন্ডিং মতামত লোড করা যায়নি')
      else setRows((data ?? []) as PendingReview[])
      setLoading(false)
    }
    void loadReviews()
  }, [])

  async function approve(id: string) {
    setSaving(id)
    setError('')
    const { error: updateError } = await supabase.from('guardian_reviews').update({ is_approved: true }).eq('id', id)
    if (updateError) setError('মতামত অনুমোদন করা যায়নি')
    else setRows((current) => current.filter((row) => row.id !== id))
    setSaving(null)
  }

  async function reject(id: string) {
    if (!window.confirm('এই মতামতটি মুছে ফেলতে চান?')) return
    setSaving(id)
    setError('')
    const { error: deleteError } = await supabase.from('guardian_reviews').delete().eq('id', id)
    if (deleteError) setError('মতামত মুছে ফেলা যায়নি')
    else setRows((current) => current.filter((row) => row.id !== id))
    setSaving(null)
  }

  return <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">{error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}{loading ? <p className="py-12 text-center text-slate-500">লোড হচ্ছে...</p> : rows.length === 0 ? <p className="py-12 text-center text-slate-500">কোনো পেন্ডিং মতামত নেই</p> : <div className="space-y-4">{rows.map((row) => <article key={row.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h2 className="font-semibold text-blue-950">{row.name}</h2><p className="mt-1 text-sm text-slate-500">{new Date(row.created_at).toLocaleDateString('bn-BD')}</p></div><div className="flex items-center gap-1" aria-label={`${row.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} className={value <= row.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />)}</div></div><p className="mt-4 whitespace-pre-line text-slate-700">{row.review}</p><div className="mt-4 flex flex-wrap gap-2 border-t pt-3"><button type="button" disabled={saving === row.id} onClick={() => void approve(row.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={16} />Approve</button><button type="button" disabled={saving === row.id} onClick={() => void reject(row.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Trash2 size={16} />Reject/Delete</button></div></article>)}</div>}</div>
}