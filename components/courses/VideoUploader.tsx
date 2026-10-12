'use client'
import { useState } from 'react'
import * as tus from 'tus-js-client'
import { supabase } from '../../lib/supabaseClient'

export default function VideoUploader({ courseId, onLessonAdded }: {
  courseId: string
  onLessonAdded: (title: string) => void
}) {
  const [lessonTitle, setLessonTitle] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')

  async function handleFile(file: File) {
    if (!lessonTitle.trim()) { setErr('লেসনের নাম লিখুন'); return }
    setStatus('uploading'); setErr(''); setProgress(0)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setErr('লগইন করুন'); setStatus('error'); return }

    const cfgRes = await fetch('/api/bunny/create-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ courseId, title: lessonTitle.trim() }),
    })
    const cfg = await cfgRes.json()
    if (!cfgRes.ok) { setErr(cfg.error || 'সমস্যা হয়েছে'); setStatus('error'); return }

    const upload = new tus.Upload(file, {
      endpoint: cfg.endpoint,
      retryDelays: [0, 3000, 5000, 10000],
      headers: {
        AuthorizationSignature: cfg.signature,
        AuthorizationExpire: String(cfg.expire),
        VideoId: cfg.videoId,
        LibraryId: cfg.libraryId,
      },
      metadata: { filetype: file.type, title: lessonTitle.trim() },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => {
        setStatus('done')
        onLessonAdded(lessonTitle.trim())
      },
      onError: (e) => { setErr('আপলোড ব্যর্থ: ' + e.message); setStatus('error') },
    })
    upload.start()
  }

  function reset() {
    setStatus('idle')
    setLessonTitle('')
    setProgress(0)
    setErr('')
  }

  return (
    <div className="rounded-lg border p-4">
      {status === 'idle' && (
        <div className="space-y-3">
          <input
            placeholder="লেসনের নাম (যেমন: লেসন ১ - ভেক্টর পরিচিতি)"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            className="w-full rounded border p-2"
          />
          <label className="block cursor-pointer rounded bg-sky-50 p-6 text-center text-sky-700 transition hover:bg-sky-100">
            ভিডিও ফাইল সিলেক্ট করুন
            <input type="file" accept="video/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
      )}
      {status === 'uploading' && (
        <div>
          <p className="mb-2 text-sm font-medium">{lessonTitle}</p>
          <div className="h-3 w-full overflow-hidden rounded bg-gray-200">
            <div className="h-full bg-sky-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-gray-600">আপলোড হচ্ছে... {progress}%</p>
        </div>
      )}
      {status === 'done' && (
        <div>
          <p className="text-green-700">✓ "{lessonTitle}" আপলোড হয়েছে।</p>
          <button onClick={reset} className="mt-3 rounded bg-sky-600 px-4 py-2 text-white transition hover:bg-sky-700">
            আরও লেসন যোগ করুন
          </button>
        </div>
      )}
      {status === 'error' && (
        <div>
          <p className="text-red-600">{err}</p>
          <button onClick={() => setStatus('idle')} className="mt-2 rounded border px-3 py-1">আবার চেষ্টা করুন</button>
        </div>
      )}
    </div>
  )
}