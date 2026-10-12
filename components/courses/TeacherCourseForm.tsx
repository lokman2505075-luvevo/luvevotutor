'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import VideoUploader from './VideoUploader'
import ComboInput from './ComboInput'

const SUBJECTS = ['গণিত', 'বাংলা', 'ইংরেজি', 'পদার্থবিজ্ঞান', 'রসায়ন', 'জীববিজ্ঞান', 'ভূগোল', 'অন্যান্য']
const CLASSES = ['ক্লাস ৬', 'ক্লাস ৭', 'ক্লাস ৮', 'ক্লাস ৯', 'ক্লাস ১০', 'HSC ১ম বর্ষ', 'HSC ২য় বর্ষ']

type Lesson = { title: string }

export default function TeacherCourseForm() {
  const { user, profile } = useAuth() as any
  const [step, setStep] = useState<'form' | 'lessons'>('form')
  const [courseId, setCourseId] = useState('')
  const [form, setForm] = useState({
    title: '', subject: SUBJECTS[0], chapter: '', class_level: CLASSES[0],
    price: '', description: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function submitCourseInfo() {
    if (!form.title.trim() || !form.price) return setErr('শিরোনাম ও মূল্য আবশ্যক')
    if (!user) return setErr('লগইন করুন')
    setBusy(true); setErr('')

    const { data, error } = await supabase.from('courses').insert({
      teacher_id: user.id,
      teacher_name: profile?.full_name || user.email,
      title: form.title.trim(),
      subject: form.subject.trim(),
      chapter: form.chapter.trim() || null,
      class_level: form.class_level.trim(),
      price: Number(form.price),
      description: form.description.trim() || null,
      status: 'draft',
    }).select().single()

    setBusy(false)
    if (error) return setErr('সমস্যা হয়েছে: ' + error.message)
    setCourseId(data.id)
    setStep('lessons')
  }

  function handleLessonAdded(lessonTitle: string) {
    setLessons((prev) => [...prev, { title: lessonTitle }])
  }

  async function submitCourseForReview() {
    if (lessons.length === 0) return
    setSubmitting(true)
    await supabase.from('courses').update({ status: 'pending' }).eq('id', courseId)
    setSubmitting(false)
    setSubmitted(true)
  }

  if (step === 'lessons') {
    if (submitted) {
      return (
        <div className="mx-auto max-w-lg rounded-xl bg-green-50 p-6 text-center">
          <p className="text-lg font-bold text-green-800">✓ কোর্স জমা হয়েছে</p>
          <p className="mt-1 text-sm text-green-700">
            Admin অনুমোদন দিলে কোর্সটি মার্কেটপ্লেসে দেখা যাবে।
          </p>
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h3 className="text-lg font-bold">"{form.title}" — লেসন যোগ করুন</h3>
          <p className="mt-1 text-sm text-gray-500">কমপক্ষে ১টা ভিডিও লেসন আপলোড করতে হবে।</p>
        </div>

        {lessons.length > 0 && (
          <div className="rounded-lg border bg-white">
            <p className="border-b px-4 py-2 text-sm font-semibold text-gray-600">
              যোগ করা লেসন ({lessons.length})
            </p>
            <ul>
              {lessons.map((lesson, i) => (
                <li key={i} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                    {i + 1}
                  </span>
                  <span className="text-sm">{lesson.title}</span>
                  <span className="ml-auto text-xs text-green-600">✓ আপলোড হয়েছে</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <VideoUploader courseId={courseId} onLessonAdded={handleLessonAdded} />

        <button
          onClick={submitCourseForReview}
          disabled={lessons.length === 0 || submitting}
          className="w-full rounded bg-green-600 py-2 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'জমা হচ্ছে...' : lessons.length === 0 ? 'কমপক্ষে ১টা লেসন যোগ করুন' : `কোর্স সাবমিট করুন (${lessons.length}টি লেসন)`}
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h3 className="text-lg font-bold">নতুন কোর্স তৈরি করুন</h3>

      <input placeholder="কোর্সের শিরোনাম (যেমন: দ্বিঘাত সমীকরণ)"
        value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
        className="w-full rounded border p-2" />

      <div className="flex gap-3">
        <div className="w-1/2">
          <ComboInput
            value={form.subject}
            onChange={(v) => setForm({ ...form, subject: v })}
            options={SUBJECTS}
            placeholder="সাবজেক্ট লিখুন বা বাছাই করুন"
          />
        </div>
        <div className="w-1/2">
          <ComboInput
            value={form.class_level}
            onChange={(v) => setForm({ ...form, class_level: v })}
            options={CLASSES}
            placeholder="ক্লাস লিখুন বা বাছাই করুন"
          />
        </div>
      </div>

      <input placeholder="চ্যাপ্টার (ঐচ্ছিক)"
        value={form.chapter} onChange={e => setForm({ ...form, chapter: e.target.value })}
        className="w-full rounded border p-2" />

      <input type="number" placeholder="মূল্য (টাকা)"
        value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
        className="w-full rounded border p-2" />

      <textarea placeholder="কোর্সের বিবরণ (ঐচ্ছিক)" rows={3}
        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
        className="w-full rounded border p-2" />

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button onClick={submitCourseInfo} disabled={busy}
        className="w-full rounded bg-sky-600 py-2 text-white transition hover:bg-sky-700 disabled:opacity-50">
        {busy ? 'তৈরি হচ্ছে...' : 'পরবর্তী ধাপ (লেসন যোগ করুন)'}
      </button>
    </div>
  )
}