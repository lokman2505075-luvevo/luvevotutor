'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Course = {
  id: string; title: string; subject: string; class_level: string
  price: number; teacher_name: string; description: string | null; created_at: string
}

type Lesson = { id: string; title: string; order_index: number }

export default function CourseApprovalTable() {
  const [rows, setRows] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [previewCourseId, setPreviewCourseId] = useState<string | null>(null)
  const [previewLessons, setPreviewLessons] = useState<Lesson[]>([])
  const [previewVideoUrl, setPreviewVideoUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('courses')
      .select('id,title,subject,class_level,price,teacher_name,description,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function approve(id: string) {
    setBusyId(id)
    await supabase.from('courses').update({ status: 'approved', reject_reason: null }).eq('id', id)
    setBusyId(null); load()
  }

  async function reject(id: string) {
    const reason = prompt('বাতিলের কারণ লিখুন (শিক্ষক দেখতে পাবেন):')
    if (!reason) return
    setBusyId(id)
    await supabase.from('courses').update({ status: 'rejected', reject_reason: reason }).eq('id', id)
    setBusyId(null); load()
  }

  async function openPreview(courseId: string) {
    setPreviewCourseId(courseId)
    setPreviewLoading(true)
    setPreviewLessons([])
    setPreviewVideoUrl('')

    const { data: { session } } = await supabase.auth.getSession()
    const r = await fetch(`/api/courses/${courseId}/lessons`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const j = await r.json()
    if (r.ok && j.lessons.length > 0) {
      setPreviewLessons(j.lessons)
      await playLesson(j.lessons[0].id, session?.access_token)
    }
    setPreviewLoading(false)
  }

  async function playLesson(lessonId: string, token?: string) {
    const accessToken = token || (await supabase.auth.getSession()).data.session?.access_token
    const r = await fetch(`/api/lessons/${lessonId}/play`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const j = await r.json()
    if (r.ok) setPreviewVideoUrl(j.url)
  }

  if (loading) return <p>লোড হচ্ছে...</p>
  if (rows.length === 0) return <p className="text-gray-500">অনুমোদনের অপেক্ষায় কোনো কোর্স নেই।</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3">কোর্স</th><th className="p-3">শিক্ষক</th>
            <th className="p-3">ক্লাস</th><th className="p-3">মূল্য</th>
            <th className="p-3">অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(c => (
            <tr key={c.id} className="border-b align-top">
              <td className="p-3">
                <div className="font-semibold">{c.title}</div>
                <div className="text-xs text-gray-500">{c.subject}</div>
                {c.description && <p className="mt-1 max-w-md text-xs text-gray-600">{c.description}</p>}
              </td>
              <td className="p-3">{c.teacher_name}</td>
              <td className="p-3">{c.class_level}</td>
              <td className="p-3">{c.price} টাকা</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => openPreview(c.id)} className="rounded border px-3 py-1 transition hover:bg-gray-50">লেসন দেখুন</button>
                  <button disabled={busyId === c.id} onClick={() => approve(c.id)}
                    className="rounded bg-green-600 px-3 py-1 text-white transition hover:bg-green-700 disabled:opacity-50">Approve</button>
                  <button disabled={busyId === c.id} onClick={() => reject(c.id)}
                    className="rounded bg-red-600 px-3 py-1 text-white transition hover:bg-red-700 disabled:opacity-50">Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {previewCourseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="grid w-full max-w-4xl gap-4 rounded-xl bg-white p-4 lg:grid-cols-[1fr,220px]">
            <div>
              {previewLoading || !previewVideoUrl ? (
                <div className="flex aspect-video items-center justify-center rounded bg-gray-100 text-gray-400">
                  লোড হচ্ছে...
                </div>
              ) : (
                <div className="relative w-full overflow-hidden rounded" style={{ paddingTop: '56.25%' }}>
                  <iframe src={previewVideoUrl} className="absolute inset-0 h-full w-full border-0" allowFullScreen />
                </div>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto rounded border">
              <p className="border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                লেসন ({previewLessons.length})
              </p>
              {previewLessons.map((lesson, i) => (
                <button
                  key={lesson.id}
                  onClick={() => playLesson(lesson.id)}
                  className="block w-full px-3 py-2 text-left text-sm transition hover:bg-sky-50"
                >
                  {i + 1}. {lesson.title}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPreviewCourseId(null)}
              className="lg:col-span-2 mt-2 rounded border px-4 py-2 transition hover:bg-gray-50"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  )
}