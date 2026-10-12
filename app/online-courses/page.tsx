'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthContext'
import PurchaseModal from '@/components/courses/PurchaseModal'

type Course = {
  id: string; title: string; subject: string; class_level: string
  price: number; thumbnail_url: string | null; teacher_name: string; teacher_id: string
}

export default function CourseMarketplace() {
  const { user } = useAuth()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<Record<string, string>>({})
  const [subject, setSubject] = useState('')
  const [level, setLevel] = useState('')
  const [buying, setBuying] = useState<Course | null>(null)

  async function load() {
    const { data } = await supabase
      .from('courses')
      .select('id,title,subject,class_level,price,thumbnail_url,teacher_name,teacher_id')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    setCourses(data || [])

    if (user) {
      const { data: p } = await supabase
        .from('purchases').select('course_id,status').eq('student_id', user.id)
      setPurchases(Object.fromEntries((p || []).map(x => [x.course_id, x.status])))
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [user?.id])

  const subjects = useMemo(() => Array.from(new Set(courses.map(c => c.subject))), [courses])
  const levels = useMemo(() => Array.from(new Set(courses.map(c => c.class_level))), [courses])
  const filtered = courses.filter(c =>
    (!subject || c.subject === subject) && (!level || c.class_level === level))

  function renderAction(c: Course) {
    if (user && (purchases[c.id] === 'paid' || c.teacher_id === user.id))
      return <Link href={`/online-courses/${c.id}/watch`}
        className="rounded bg-green-600 px-4 py-2 text-white transition hover:bg-green-700">দেখুন</Link>
    if (purchases[c.id] === 'pending')
      return <span className="rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-800">পেমেন্ট যাচাই চলছে</span>
    return <button
      onClick={() => user ? setBuying(c) : router.push('/login')}
      className="rounded bg-sky-600 px-4 py-2 text-white transition hover:bg-sky-700">কিনুন</button>
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <h2 className="mb-6 text-3xl font-bold">কোর্স মার্কেটপ্লেস</h2>

      <div className="mb-8 flex gap-3">
        <select value={subject} onChange={e => setSubject(e.target.value)} className="rounded border px-3 py-2">
          <option value="">সব সাবজেক্ট</option>
          {subjects.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={level} onChange={e => setLevel(e.target.value)} className="rounded border px-3 py-2">
          <option value="">সব ক্লাস/লেভেল</option>
          {levels.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {loading ? <p>লোড হচ্ছে...</p> : filtered.length === 0 ? (
        <p className="text-gray-500">এখনো কোনো কোর্স নেই।</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map(c => (
            <div
              key={c.id}
              className="flex flex-col rounded-xl bg-white p-5 shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {c.thumbnail_url
                ? <img src={c.thumbnail_url} alt={c.title} className="h-44 w-full rounded object-cover" />
                : <div className="flex h-44 items-center justify-center rounded bg-sky-50 text-sky-300">কোর্সের ছবি</div>}
              <h3 className="mt-4 font-bold">{c.title}</h3>
              <p className="text-sm text-gray-500">শিক্ষক: {c.teacher_name}</p>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="rounded bg-sky-100 px-2 py-1">{c.subject}</span>
                <span className="rounded bg-yellow-100 px-2 py-1">{c.class_level}</span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-lg font-bold">{c.price} টাকা</span>
                {renderAction(c)}
              </div>
            </div>
          ))}
        </div>
      )}

      {buying && user && (
        <PurchaseModal course={buying} userId={user.id}
          onClose={() => setBuying(null)}
          onDone={() => { setBuying(null); load() }} />
      )}
    </section>
  )
}