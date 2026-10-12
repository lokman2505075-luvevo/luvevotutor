'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '../../../../components/Navbar'
import Footer from '../../../../components/Footer'
import { supabase } from '../../../../lib/supabaseClient'

type Course = { title: string }
type Lesson = { id: string; title: string; order_index: number }
type LessonNote = {
  id: string
  lesson_id: string
  content: string
  video_timestamp_seconds: number
  created_at: string
}

type CourseLessonsResponse = {
  course?: Course
  lessons?: Lesson[]
  error?: string
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    || 'course'
}

function formatVideoTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = String(safeSeconds % 60).padStart(2, '0')
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainingSeconds}`
  }
  return `${minutes}:${remainingSeconds}`
}

export default function CourseNotesPage({ params }: { params: { courseId: string } }) {
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [notes, setNotes] = useState<LessonNote[]>([])
  const [studentName, setStudentName] = useState('')
  const [loading, setLoading] = useState(true)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadNotes() {
      setLoading(true)
      setError('')

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        const metadataName = session.user.user_metadata.full_name
          || session.user.user_metadata.name
          || session.user.email
          || ''
        setStudentName(String(metadataName))
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .maybeSingle()
        if (profile?.full_name) setStudentName(profile.full_name)

        const courseResponse = await fetch(`/api/courses/${params.courseId}/lessons`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const courseResult = await courseResponse.json() as CourseLessonsResponse
        if (!courseResponse.ok) {
          throw new Error(courseResult.error || 'কোর্সের তথ্য লোড করা যায়নি')
        }
        if (!courseResult.course || !Array.isArray(courseResult.lessons)) {
          throw new Error('কোর্সের তথ্য পাওয়া যায়নি')
        }
        if (cancelled) return
        setCourse(courseResult.course)
        setLessons(courseResult.lessons)

        const { data, error: notesError } = await supabase
          .from('lesson_notes')
          .select('id, lesson_id, content, video_timestamp_seconds, created_at')
          .eq('user_id', session.user.id)
          .eq('course_id', params.courseId)
          .order('created_at', { ascending: true })
        if (notesError) throw new Error('কোর্সের নোট লোড করা যায়নি')
        if (!cancelled) setNotes((data || []) as LessonNote[])
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'কোর্সের নোট লোড করা যায়নি')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadNotes()
    return () => { cancelled = true }
  }, [params.courseId, router])

  const groupedNotes = useMemo(() => lessons
    .map(lesson => ({
      lesson,
      notes: notes
        .filter(note => note.lesson_id === lesson.id)
        .sort((first, second) => first.video_timestamp_seconds - second.video_timestamp_seconds),
    }))
    .filter(group => group.notes.length > 0), [lessons, notes])

  function downloadNotes() {
    if (!course) return
    const lines = [course.title, '']
    for (const group of groupedNotes) {
      lines.push(group.lesson.title)
      for (const note of group.notes) {
        lines.push(`[${formatVideoTime(note.video_timestamp_seconds)}] ${note.content}`)
      }
      lines.push('')
    }

    const file = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sanitizeFilename(course.title)}-notes.txt`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function downloadPdf(lessonId?: string) {
    if (!course || notes.length === 0) return

    const selectedGroups = groupedNotes.filter(group => !lessonId || group.lesson.id === lessonId)
    if (selectedGroups.length === 0) {
      setError('কোনো নোট নেই')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setError('PDF তৈরির উইন্ডো খোলা যায়নি। ব্রাউজারের পপ-আপ অনুমতি দিন।')
      return
    }

    setError('')
    setPdfGenerating(true)
    try {
      const courseTitle = escapeHtml(course.title)
      const printGroups = selectedGroups.map(({ lesson, notes: lessonNotes }) => `
        <section class="lesson">
          <h2>${escapeHtml(lesson.title)}</h2>
          ${lessonNotes.map(note => `
            <article class="note">
              <span class="timestamp">${formatVideoTime(note.video_timestamp_seconds)}</span>
              <p>${escapeHtml(note.content).replace(/\r?\n/g, '<br>')}</p>
            </article>
          `).join('')}
        </section>
      `).join('')
      const downloadedAt = new Intl.DateTimeFormat('bn-BD', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date())
      const filename = lessonId
        ? `${sanitizeFilename(course.title)}-${sanitizeFilename(selectedGroups[0].lesson.title)}-notes.pdf`
        : `${sanitizeFilename(course.title)}-notes.pdf`
      const documentHtml = `<!doctype html>
      <html lang="bn">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${escapeHtml(filename)}</title>
          <style>
            @page {
              size: A4;
              margin: 18mm 17mm 20mm;
              @bottom-center {
                content: "পৃষ্ঠা " counter(page) " / " counter(pages);
                color: #64748b;
                font-size: 9pt;
                font-family: "Nirmala UI", "Noto Sans Bengali", "Vrinda", sans-serif;
              }
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #172033;
              font-family: "Nirmala UI", "Noto Sans Bengali", "Vrinda", sans-serif;
              font-size: 11pt;
              line-height: 1.65;
              overflow-wrap: anywhere;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            header {
              margin-bottom: 9mm;
              padding-bottom: 5mm;
              border-bottom: 1px solid #cbd5e1;
            }
            h1 { margin: 0 0 2mm; font-size: 19pt; line-height: 1.35; }
            .subtitle { margin: 0 0 3mm; color: #334155; font-size: 14pt; font-weight: 600; }
            .metadata { display: flex; flex-wrap: wrap; gap: 2mm 8mm; color: #64748b; font-size: 9pt; }
            .lesson { margin: 0 0 7mm; }
            h2 {
              margin: 0 0 3mm;
              padding: 2mm 3mm;
              border-left: 3px solid #0284c7;
              background: #f1f5f9;
              font-size: 13pt;
              break-after: avoid-page;
            }
            .note {
              display: flex;
              align-items: flex-start;
              gap: 3mm;
              margin: 0;
              padding: 2.5mm 1mm;
              border-bottom: 1px solid #e2e8f0;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .timestamp {
              flex: 0 0 auto;
              min-width: 14mm;
              color: #0369a1;
              font-size: 9pt;
              font-weight: 700;
              font-variant-numeric: tabular-nums;
            }
            .note p { min-width: 0; margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
            @media screen {
              body { max-width: 210mm; margin: 12mm auto; padding: 14mm 17mm; box-shadow: 0 1px 8px #cbd5e1; }
            }
          </style>
        </head>
        <body>
          <header>
            <h1>${courseTitle}</h1>
            <p class="subtitle">আমার নোট</p>
            <div class="metadata">
              <span>শিক্ষার্থী: ${escapeHtml(studentName || 'শিক্ষার্থী')}</span>
              <span>ডাউনলোডের তারিখ: ${escapeHtml(downloadedAt)}</span>
            </div>
          </header>
          ${printGroups}
          <script>window.addEventListener('load', () => window.print());</script>
        </body>
      </html>`

      printWindow.document.open()
      printWindow.document.write(documentHtml)
      printWindow.document.close()
      printWindow.document.title = filename
      printWindow.addEventListener('afterprint', () => setPdfGenerating(false), { once: true })
      window.setTimeout(() => setPdfGenerating(false), 1500)
    } catch {
      printWindow.close()
      setPdfGenerating(false)
      setError('PDF তৈরি করা যায়নি। আবার চেষ্টা করুন।')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">কোর্সের নোট</h1>
            {course && <p className="mt-1 text-gray-600">{course.title}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/online-courses/${params.courseId}/watch`}
              className="rounded-lg border border-sky-600 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
            >
              কোর্সে ফিরে যান
            </Link>
            <button
              type="button"
              onClick={downloadNotes}
              disabled={loading || notes.length === 0}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ডাউনলোড (.txt)
            </button>
            <button
              type="button"
              onClick={() => downloadPdf()}
              disabled={loading || notes.length === 0 || pdfGenerating}
              className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfGenerating ? 'PDF তৈরি হচ্ছে...' : 'ডাউনলোড (PDF)'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="rounded-xl bg-white p-6 text-gray-500 shadow-sm">নোট লোড হচ্ছে...</p>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-6 text-red-700">{error}</p>
        ) : groupedNotes.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-gray-500 shadow-sm">কোনো নোট নেই</p>
        ) : (
          <div className="space-y-5">
            {groupedNotes.map(({ lesson, notes: lessonNotes }) => (
              <section key={lesson.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                  <h2 className="font-semibold text-gray-900">{lesson.title}</h2>
                  <button
                    type="button"
                    onClick={() => downloadPdf(lesson.id)}
                    disabled={pdfGenerating}
                    className="rounded-lg border border-sky-600 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    এই লেসনের নোট ডাউনলোড
                  </button>
                </div>
                <ul className="divide-y">
                  {lessonNotes.map(note => (
                    <li key={note.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                      <span className="shrink-0 rounded bg-sky-50 px-2 py-1 text-sm font-medium text-sky-700">
                        {formatVideoTime(note.video_timestamp_seconds)}
                      </span>
                      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                        {note.content}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
