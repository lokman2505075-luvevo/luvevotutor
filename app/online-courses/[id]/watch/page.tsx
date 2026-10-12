'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

type BunnyPlayer = {
  on: (event: 'ready' | 'timeupdate' | 'pause' | 'seeked', callback: (value?: unknown) => void) => void | Promise<void>
  off: (event: 'ready' | 'timeupdate' | 'pause' | 'seeked', callback: (value?: unknown) => void) => void | Promise<void>
  getCurrentTime: (callback: (seconds: number) => void) => void | Promise<number>
  setCurrentTime: (seconds: number) => void | Promise<void>
  destroy?: () => void | Promise<void>
}

type BunnyPlayerJs = {
  Player: new (iframe: HTMLIFrameElement) => BunnyPlayer
}

declare global {
  interface Window {
    playerjs?: BunnyPlayerJs
  }
}

type Course = {
  title: string
  teacher_name: string
  description: string | null
}

type Lesson = { id: string; title: string; order_index: number }

type LessonProgress = {
  completed: boolean
  last_position_seconds: number
}

type LessonNote = {
  id: string
  course_id: string
  lesson_id: string
  content: string
  video_timestamp_seconds: number
  created_at: string
  updated_at: string
}

type LessonsResponse = {
  course?: Course
  lessons?: Lesson[]
  error?: string
}

type PlayResponse = { url?: string; error?: string }

function formatVideoTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = String(safeSeconds % 60).padStart(2, '0')
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainingSeconds}`
  }
  return `${minutes}:${remainingSeconds}`
}

function ignoreRejectedOperation(operation: void | Promise<unknown>) {
  if (operation && typeof operation.then === 'function') {
    void operation.catch(() => {})
  }
}

function readPlayerTime(
  player: BunnyPlayer,
  isActive: () => boolean,
  fallback: number,
): Promise<number> {
  return new Promise(resolve => {
    let settled = false
    const finish = (seconds: number) => {
      if (settled) return
      settled = true
      resolve(isActive() && Number.isFinite(seconds) && seconds >= 0 ? seconds : fallback)
    }

    try {
      const operation = player.getCurrentTime(finish)
      if (operation && typeof operation.then === 'function') {
        void operation.then(seconds => finish(seconds)).catch(() => finish(fallback))
      }
    } catch {
      finish(fallback)
    }
  })
}

export default function WatchPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [activeLessonId, setActiveLessonId] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [currentPosition, setCurrentPosition] = useState(0)
  const [error, setError] = useState('')
  const [progressError, setProgressError] = useState('')
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({})
  const [notes, setNotes] = useState<LessonNote[]>([])
  const [noteContent, setNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [videoLoading, setVideoLoading] = useState(false)
  const [playerApiLoaded, setPlayerApiLoaded] = useState(false)
  const [playerApiError, setPlayerApiError] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<BunnyPlayer | null>(null)
  const currentPositionRef = useRef(0)
  const playerReadyRef = useRef(false)
  const resumeRequestedRef = useRef(false)
  const lastProgressSaveAtRef = useRef<Record<string, number>>({})
  const progressSavePromisesRef = useRef(new Map<string, Promise<void>>())
  const progressRef = useRef(progress)
  progressRef.current = progress

  const persistProgress = useCallback(async function saveLessonProgress(
    lessonId: string,
    positionSeconds: number,
    completed: boolean,
    force = false,
  ) {
    if (!userId || !params.id) return

    const now = Date.now()
    const pendingSave = progressSavePromisesRef.current.get(lessonId)
    if (pendingSave) {
      if (!force) return
      await pendingSave
      await saveLessonProgress(lessonId, positionSeconds, completed, true)
      return
    }
    if (!force && now - (lastProgressSaveAtRef.current[lessonId] || 0) < 10000) return

    const lastPosition = Math.max(0, Math.floor(positionSeconds))
    const nextProgress = {
      completed,
      last_position_seconds: lastPosition,
    }
    lastProgressSaveAtRef.current[lessonId] = now

    const savePromise = (async () => {
      try {
        const { error: saveError } = await supabase.from('lesson_progress').upsert({
          user_id: userId,
          course_id: params.id,
          lesson_id: lessonId,
          ...nextProgress,
          updated_at: new Date(now).toISOString(),
        }, { onConflict: 'user_id,lesson_id' })
        if (saveError) {
          setProgressError('অগ্রগতি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।')
          return
        }

        setProgress(previous => ({ ...previous, [lessonId]: nextProgress }))
        setProgressError('')
      } catch {
        setProgressError('অগ্রগতি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।')
      }
    })()
    progressSavePromisesRef.current.set(lessonId, savePromise)
    try {
      await savePromise
    } finally {
      if (progressSavePromisesRef.current.get(lessonId) === savePromise) {
        progressSavePromisesRef.current.delete(lessonId)
      }
    }
  }, [params.id, userId])

  const loadLesson = useCallback(async (
    lessonId: string,
    token: string,
    lastPositionSeconds = 0,
  ) => {
    setActiveLessonId(lessonId)
    setVideoUrl('')
    setError('')
    setVideoLoading(true)
    playerReadyRef.current = false
    resumeRequestedRef.current = false
    currentPositionRef.current = lastPositionSeconds
    setCurrentPosition(lastPositionSeconds)

    try {
      const response = await fetch(`/api/lessons/${lessonId}/play`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json() as PlayResponse
      if (!response.ok || !result.url) {
        throw new Error(result.error || 'ভিডিও লোড করা যায়নি')
      }
      setVideoUrl(result.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ভিডিও লোড করা যায়নি')
    } finally {
      setVideoLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadCourse() {
      setLoading(true)
      setError('')
      setCourse(null)
      setLessons([])
      setActiveLessonId('')
      setVideoUrl('')
      setProgress({})
      setProgressError('')
      setNotes([])
      setNoteContent('')
      setEditingNoteId(null)
      setEditingNoteContent('')
      setNoteError('')
      setUserId('')

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/courses/${params.id}/lessons`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const result = await response.json() as LessonsResponse
        if (!response.ok) {
          throw new Error(result.error || 'লেসন তালিকা লোড করা যায়নি')
        }
        if (!Array.isArray(result.lessons) || !result.course) {
          throw new Error('সার্ভার থেকে কোর্সের তথ্য পাওয়া যায়নি')
        }
        if (cancelled) return

        setUserId(session.user.id)
        setCourse(result.course)
        setLessons(result.lessons)
        const { data: progressRows, error: progressLoadError } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed, last_position_seconds')
          .eq('user_id', session.user.id)
          .eq('course_id', params.id)
        if (progressLoadError) {
          throw new Error('কোর্সের অগ্রগতি লোড করা যায়নি')
        }
        if (cancelled) return
        const progressByLesson = Object.fromEntries((progressRows || []).map(row => [
          row.lesson_id,
          {
            completed: row.completed,
            last_position_seconds: row.last_position_seconds,
          },
        ]))
        setProgress(progressByLesson)
        if (result.lessons.length > 0) {
          await loadLesson(
            result.lessons[0].id,
            session.access_token,
            progressByLesson[result.lessons[0].id]?.last_position_seconds || 0,
          )
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'কোর্স লোড করা যায়নি')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCourse()
    return () => { cancelled = true }
  }, [loadLesson, params.id, router])

  useEffect(() => {
    let cancelled = false
    if (!userId || !activeLessonId) {
      setNotes([])
      setNotesLoading(false)
      return
    }

    async function loadNotes() {
      setNotesLoading(true)
      setNoteError('')
      setNotes([])
      setNoteContent('')
      setEditingNoteId(null)
      setEditingNoteContent('')

      try {
        const { data, error: notesLoadError } = await supabase
          .from('lesson_notes')
          .select('id, course_id, lesson_id, content, video_timestamp_seconds, created_at, updated_at')
          .eq('user_id', userId)
          .eq('course_id', params.id)
          .eq('lesson_id', activeLessonId)
          .order('video_timestamp_seconds', { ascending: true })
        if (notesLoadError) throw new Error('নোট লোড করা যায়নি')
        if (!cancelled) setNotes((data || []) as LessonNote[])
      } catch (cause) {
        if (!cancelled) {
          setNoteError(cause instanceof Error ? cause.message : 'নোট লোড করা যায়নি')
        }
      } finally {
        if (!cancelled) setNotesLoading(false)
      }
    }

    void loadNotes()
    return () => { cancelled = true }
  }, [activeLessonId, params.id, userId])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !activeLessonId || !videoUrl || !playerApiLoaded || !window.playerjs) return

    let cancelled = false
    let destroyed = false
    let pollInterval: number | undefined
    let player: BunnyPlayer
    try {
      player = new window.playerjs.Player(iframe)
    } catch {
      setPlayerApiError('ভিডিওর সময় নিয়ন্ত্রণ চালু করা যায়নি')
      return
    }
    playerRef.current = player

    function cleanupPlayer() {
      if (destroyed) return
      cancelled = true
      destroyed = true
      if (pollInterval !== undefined) {
        window.clearInterval(pollInterval)
        pollInterval = undefined
      }
      if (playerRef.current === player) playerRef.current = null
      playerReadyRef.current = false

      if (player.destroy) {
        try {
          const operation = player.destroy()
          if (operation && typeof operation.then === 'function') {
            void operation.catch(() => {})
          }
        } catch {}
        return
      }

      try { ignoreRejectedOperation(player.off('ready', handleReady)) } catch {}
      try { ignoreRejectedOperation(player.off('timeupdate', handleTimeUpdate)) } catch {}
      try { ignoreRejectedOperation(player.off('pause', handlePause)) } catch {}
    }

    function updateCurrentTime(forceSave = false) {
      if (cancelled || destroyed || playerRef.current !== player || !playerReadyRef.current) return
      void readPlayerTime(
        player,
        () => !cancelled && !destroyed && playerRef.current === player && playerReadyRef.current,
        currentPositionRef.current,
      ).then(seconds => {
        if (cancelled || destroyed || playerRef.current !== player || !playerReadyRef.current) return
        currentPositionRef.current = seconds
        setCurrentPosition(Math.floor(seconds))
        void persistProgress(
          activeLessonId,
          seconds,
          progressRef.current[activeLessonId]?.completed || false,
          forceSave,
        )
      })
    }

    function handleReady() {
      if (cancelled || destroyed || playerRef.current !== player) return
      playerReadyRef.current = true
      if (resumeRequestedRef.current) {
        try {
          const operation = player.setCurrentTime(currentPositionRef.current)
          if (operation && typeof operation.then === 'function') {
            void operation.catch(() => {
              if (!cancelled && !destroyed && playerRef.current === player) {
                setPlayerApiError('ভিডিওর সময় পরিবর্তন করা যায়নি')
              }
            })
          }
          resumeRequestedRef.current = false
        } catch {
          setPlayerApiError('ভিডিওর সময় পরিবর্তন করা যায়নি')
        }
      }
      updateCurrentTime()
      pollInterval = window.setInterval(() => updateCurrentTime(), 1000)
    }

    const handleTimeUpdate = () => updateCurrentTime()
    const handlePause = () => updateCurrentTime(true)
    try {
      ignoreRejectedOperation(player.on('ready', handleReady))
      ignoreRejectedOperation(player.on('timeupdate', handleTimeUpdate))
      ignoreRejectedOperation(player.on('pause', handlePause))
    } catch {
      cleanupPlayer()
      setPlayerApiError('ভিডিওর সময় নিয়ন্ত্রণ চালু করা যায়নি')
      return
    }

    return cleanupPlayer
  }, [activeLessonId, persistProgress, playerApiLoaded, videoUrl])

  function seekToPosition(seconds: number) {
    if (playerApiError) {
      setNoteError(playerApiError)
      return
    }

    const position = Math.max(0, Math.floor(seconds))
    currentPositionRef.current = position
    setCurrentPosition(position)
    resumeRequestedRef.current = true
    if (playerReadyRef.current && playerRef.current) {
      const player = playerRef.current
      try {
        const operation = player.setCurrentTime(position)
        if (operation && typeof operation.then === 'function') {
          void operation.catch(() => {
            if (playerRef.current === player && playerReadyRef.current) {
              setPlayerApiError('ভিডეოর সময় পরিবর্তন করা যায়নি')
            }
          })
        }
        resumeRequestedRef.current = false
      } catch {
        setPlayerApiError('ভিডিওর সময় পরিবর্তন করা যায়নি')
      }
    }
  }

  function resumeFromPreviousPosition() {
    const lastPosition = progress[activeLessonId]?.last_position_seconds || 0
    if (lastPosition <= 0) return

    seekToPosition(lastPosition)
  }

  function getCurrentVideoTime() {
    const player = playerRef.current
    if (!player || !playerReadyRef.current) {
      return Promise.resolve(currentPositionRef.current)
    }

    return readPlayerTime(
      player,
      () => playerRef.current === player && playerReadyRef.current,
      currentPositionRef.current,
    ).then(seconds => {
      if (playerRef.current === player && playerReadyRef.current) {
        currentPositionRef.current = seconds
        setCurrentPosition(Math.floor(seconds))
      }
      return seconds
    })
  }

  async function saveNote() {
    const content = noteContent.trim()
    if (!content) {
      setNoteError('নোট লিখুন')
      return
    }
    if (!userId || !activeLessonId) {
      setNoteError('নোট সংরক্ষণের জন্য একটি লেসন বেছে নিন')
      return
    }

    setNoteSaving(true)
    setNoteError('')
    try {
      const timestampSeconds = Math.max(0, Math.floor(await getCurrentVideoTime()))
      const { data, error: saveError } = await supabase
        .from('lesson_notes')
        .insert({
          user_id: userId,
          course_id: params.id,
          lesson_id: activeLessonId,
          content,
          video_timestamp_seconds: timestampSeconds,
        })
        .select('id, course_id, lesson_id, content, video_timestamp_seconds, created_at, updated_at')
        .single()
      if (saveError || !data) throw new Error('নোট সংরক্ষণ করা যায়নি')
      setNotes(previous => [...previous, data as LessonNote]
        .sort((first, second) => first.video_timestamp_seconds - second.video_timestamp_seconds))
      setNoteContent('')
    } catch (cause) {
      setNoteError(cause instanceof Error ? cause.message : 'নোট সংরক্ষণ করা যায়নি')
    } finally {
      setNoteSaving(false)
    }
  }

  async function saveNoteEdit(noteId: string) {
    const content = editingNoteContent.trim()
    if (!content) {
      setNoteError('নোট লিখুন')
      return
    }

    setNoteSaving(true)
    setNoteError('')
    try {
      const { data, error: updateError } = await supabase
        .from('lesson_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', userId)
        .select('id, course_id, lesson_id, content, video_timestamp_seconds, created_at, updated_at')
        .single()
      if (updateError || !data) throw new Error('নোট পরিবর্তন করা যায়নি')
      setNotes(previous => previous.map(note => note.id === noteId ? data as LessonNote : note))
      setEditingNoteId(null)
      setEditingNoteContent('')
    } catch (cause) {
      setNoteError(cause instanceof Error ? cause.message : 'নোট পরিবর্তন করা যায়নি')
    } finally {
      setNoteSaving(false)
    }
  }

  async function deleteNote(noteId: string) {
    setNoteError('')
    try {
      const { error: deleteError } = await supabase
        .from('lesson_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId)
      if (deleteError) throw new Error('নোট মুছে ফেলা যায়নি')
      setNotes(previous => previous.filter(note => note.id !== noteId))
      if (editingNoteId === noteId) {
        setEditingNoteId(null)
        setEditingNoteContent('')
      }
    } catch (cause) {
      setNoteError(cause instanceof Error ? cause.message : 'নোট মুছে ফেলা যায়নি')
    }
  }

  async function markLessonComplete(lessonId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const position = lessonId === activeLessonId
      ? currentPositionRef.current
      : progress[lessonId]?.last_position_seconds || 0
    await persistProgress(lessonId, position, true, true)
  }

  async function handleLessonClick(lessonId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    if (activeLessonId && currentPositionRef.current > 0) {
      await persistProgress(
        activeLessonId,
        currentPositionRef.current,
        progress[activeLessonId]?.completed || false,
        true,
      )
    }
    await loadLesson(
      lessonId,
      session.access_token,
      progress[lessonId]?.last_position_seconds || 0,
    )
  }

  const completedLessonCount = lessons.filter(lesson => progress[lesson.id]?.completed).length
  const progressPercent = lessons.length
    ? Math.round((completedLessonCount / lessons.length) * 100)
    : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Script
        src="https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js"
        strategy="afterInteractive"
        onLoad={() => setPlayerApiLoaded(true)}
        onError={() => setPlayerApiError('ভিডিওর সময় নিয়ন্ত্রণ লোড করা যায়নি')}
      />
      {course && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-gray-500">শিক্ষক: {course.teacher_name}</p>
        </div>
      )}

      {loading && !course ? (
        <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-gray-500">
          লোড হচ্ছে...
        </div>
      ) : error && !course ? (
        <p role="alert" className="rounded bg-red-50 p-4 text-red-700">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
          <div className="min-w-0">
            {videoLoading ? (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                ভিডিও লোড হচ্ছে...
              </div>
            ) : error ? (
              <p role="alert" className="flex aspect-video items-center justify-center rounded-xl bg-red-50 p-4 text-center text-red-700">
                {error}
              </p>
            ) : videoUrl ? (
              <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingTop: '56.25%' }}>
                <iframe
                  key={videoUrl}
                  ref={iframeRef}
                  src={videoUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={lessons.find(lesson => lesson.id === activeLessonId)?.title || 'কোর্স ভিডিও'}
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                একটি লেসন বেছে নিন
              </div>
            )}
            {videoUrl && activeLessonId
              && (progress[activeLessonId]?.last_position_seconds || 0) > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={resumeFromPreviousPosition}
                  className="rounded-lg border border-sky-600 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
                >
                  আগের জায়গা থেকে চালান
                </button>
              </div>
            )}
            {progressError && (
              <p role="alert" className="mt-3 text-sm text-red-700">{progressError}</p>
            )}
            {playerApiError && (
              <p role="alert" className="mt-3 text-sm text-red-700">{playerApiError}</p>
            )}
            {course && activeLessonId && (
              <section className="mt-6 rounded-xl border bg-white p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">নোট</h2>
                  <Link
                    href={`/my-courses/${params.id}/notes`}
                    className="text-sm font-medium text-sky-700 hover:underline"
                  >
                    কোর্সের সব নোট
                  </Link>
                </div>

                <textarea
                  value={noteContent}
                  onChange={event => setNoteContent(event.target.value)}
                  placeholder="এই মুহূর্তের জন্য নোট লিখুন..."
                  rows={3}
                  className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">
                    বর্তমান সময়: {formatVideoTime(currentPosition)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void saveNote()}
                    disabled={noteSaving}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
                  >
                    {noteSaving ? 'সংরক্ষণ হচ্ছে...' : 'নোট সংরক্ষণ করুন'}
                  </button>
                </div>

                {noteError && <p role="alert" className="mt-3 text-sm text-red-700">{noteError}</p>}

                <div className="mt-4 space-y-3">
                  {notesLoading ? (
                    <p className="text-sm text-gray-500">নোট লোড হচ্ছে...</p>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-gray-500">এই লেসনে এখনো কোনো নোট নেই।</p>
                  ) : notes.map(note => (
                    <article key={note.id} className="rounded-lg bg-gray-50 p-3">
                      {editingNoteId === note.id ? (
                        <div>
                          <textarea
                            value={editingNoteContent}
                            onChange={event => setEditingNoteContent(event.target.value)}
                            rows={3}
                            className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void saveNoteEdit(note.id)}
                              disabled={noteSaving}
                              className="rounded bg-sky-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                            >
                              সংরক্ষণ
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(null)
                                setEditingNoteContent('')
                              }}
                              className="rounded border px-3 py-1.5 text-sm text-gray-700"
                            >
                              বাতিল
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => seekToPosition(note.video_timestamp_seconds)}
                            className="min-w-0 flex-1 text-left text-sm text-gray-800 hover:text-sky-700"
                          >
                            <span className="mr-2 font-semibold text-sky-700">
                              {formatVideoTime(note.video_timestamp_seconds)}
                            </span>
                            <span className="whitespace-pre-wrap">{note.content}</span>
                          </button>
                          <div className="flex shrink-0 gap-3 text-sm">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(note.id)
                                setEditingNoteContent(note.content)
                                setNoteError('')
                              }}
                              className="text-sky-700 hover:underline"
                            >
                              সম্পাদনা
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteNote(note.id)}
                              className="text-red-700 hover:underline"
                            >
                              মুছুন
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
            {course?.description && (
              <p className="mt-5 whitespace-pre-line text-gray-700">{course.description}</p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border bg-white">
            <p className="border-b px-4 py-3 font-semibold">লেসন তালিকা ({lessons.length})</p>
            {lessons.length > 0 && (
              <div className="border-b px-4 py-3">
                <div className="mb-2 flex justify-between text-sm">
                  <span>কোর্সের অগ্রগতি</span>
                  <span className="font-semibold">{progressPercent}%</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-gray-100"
                  role="progressbar"
                  aria-label="কোর্সের অগ্রগতি"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent}
                >
                  <div
                    className="h-full rounded-full bg-sky-600 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
            {loading ? (
              <p className="px-4 py-5 text-sm text-gray-500">লেসন লোড হচ্ছে...</p>
            ) : lessons.length === 0 ? (
              <p className="px-4 py-5 text-sm text-gray-500">এই কোর্সে এখনো কোনো লেসন যোগ করা হয়নি</p>
            ) : (
              <ul>
                {lessons.map((lesson, index) => (
                  <li key={lesson.id} className="flex items-center gap-2 border-b px-3 last:border-0">
                    <button
                      type="button"
                      onClick={() => void handleLessonClick(lesson.id)}
                      className={`flex min-w-0 flex-1 items-center gap-3 py-3 text-left text-sm transition-colors ${
                        activeLessonId === lesson.id
                          ? 'font-semibold text-sky-700'
                          : 'text-gray-700 hover:text-sky-700'
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        progress[lesson.id]?.completed
                          ? 'bg-green-100 text-green-700'
                          : activeLessonId === lesson.id
                            ? 'bg-sky-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {progress[lesson.id]?.completed ? '✓' : index + 1}
                      </span>
                      <span className="truncate">{lesson.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void markLessonComplete(lesson.id)}
                      disabled={progress[lesson.id]?.completed}
                      className="shrink-0 rounded px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:text-green-700"
                    >
                      {progress[lesson.id]?.completed ? 'সম্পন্ন' : 'সম্পন্ন করুন'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
