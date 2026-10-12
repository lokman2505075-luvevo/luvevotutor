'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { Card, Empty } from '../profile/ui'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

type TuitionBooking = {
  id: string
  student_id: string
  name: string | null
  subject: string | null
  class_level: string | null
}

type TutorStudent = {
  id: string
  student_id: string | null
  display_name: string
  phone: string | null
  class_level: string
  subject: string
  status: 'active' | 'inactive'
  source: 'manual' | 'invite' | 'booking'
}

type AttendanceInvite = {
  id: string
  tutor_student_id: string
  expires_at: string
  used_at: string | null
  created_at: string
}

type AttendanceRecord = {
  student_id: string | null
  tutor_student_id: string | null
  status: AttendanceStatus
  note: string | null
  marked_at: string
}

type AttendanceSession = {
  id: string
  batch_or_tuition_id: string | null
  tuitionIds: string[]
  session_date: string
  start_time: string
  end_time: string | null
  topic: string
  records: AttendanceRecord[]
}

type RosterEntry = {
  key: string
  studentId: string | null
  tutorStudentId: string | null
  status: AttendanceStatus
  note: string
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; style: string }[] = [
  { value: 'present', label: 'উপস্থিত', style: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  { value: 'absent', label: 'অনুপস্থিত', style: 'border-red-200 bg-red-50 text-red-800' },
  { value: 'late', label: 'দেরি', style: 'border-amber-200 bg-amber-50 text-amber-800' },
  { value: 'excused', label: 'ছুটি', style: 'border-sky-200 bg-sky-50 text-sky-800' },
]

function localDateValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function displayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function displayTime(value: string | null) {
  if (!value) return ''
  const [hour, minute] = value.slice(0, 5).split(':').map(Number)
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('bn-BD', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TutorAttendanceManager() {
  const router = useRouter()
  const [bookings, setBookings] = useState<TuitionBooking[]>([])
  const [tutorStudents, setTutorStudents] = useState<TutorStudent[]>([])
  const [invites, setInvites] = useState<AttendanceInvite[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [selectedTuitionIds, setSelectedTuitionIds] = useState<string[]>([])
  const [selectedTutorStudentIds, setSelectedTutorStudentIds] = useState<string[]>([])
  const [sessionDate, setSessionDate] = useState(localDateValue)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [topic, setTopic] = useState('')
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [studentSubject, setStudentSubject] = useState('')
  const [studentPhone, setStudentPhone] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)
  const [inviteLinks, setInviteLinks] = useState<Record<string, { url: string; expiresAt: string }>>({})
  const [inviteActionId, setInviteActionId] = useState<string | null>(null)

  const uniqueBookings = useMemo(() => {
    const seen = new Set<string>()
    return bookings.filter((booking) => {
      if (seen.has(booking.student_id)) return false
      seen.add(booking.student_id)
      return true
    })
  }, [bookings])

  async function getAccessToken() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.access_token) {
      router.push('/login?next=/profile%23attendance')
      throw new Error('উপস্থিতি পরিচালনা করতে লগইন করুন')
    }
    return session.access_token
  }

  async function loadAttendance() {
    setError('')
    try {
      const accessToken = await getAccessToken()
      const response = await fetch('/api/attendance', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const result = await response.json() as {
        bookings?: TuitionBooking[]
        tutorStudents?: TutorStudent[]
        invites?: AttendanceInvite[]
        sessions?: AttendanceSession[]
        error?: string
      }
      if (!response.ok) throw new Error(result.error || 'উপস্থিতির তথ্য লোড করা যায়নি')
      setBookings(result.bookings ?? [])
      setTutorStudents(result.tutorStudents ?? [])
      setInvites(result.invites ?? [])
      setSessions(result.sessions ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'উপস্থিতির তথ্য লোড করা যায়নি')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAttendance()
    // Load once for the authenticated tutor profile view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearForm() {
    setSelectedTuitionIds([])
    setSelectedTutorStudentIds([])
    setSessionDate(localDateValue())
    setStartTime('')
    setEndTime('')
    setTopic('')
    setRoster([])
    setEditingSessionId(null)
  }

  function buildRoster(
    tuitionIds: string[],
    tutorStudentIds: string[],
    previousRoster: RosterEntry[],
  ) {
    const currentByKey = new Map(previousRoster.map((entry) => [entry.key, entry]))
    const bookingEntries = tuitionIds.flatMap((id) => {
      const booking = uniqueBookings.find((item) => item.id === id)
      if (!booking) return []
      const key = `booking:${booking.student_id}`
      return [currentByKey.get(key) ?? {
        key,
        studentId: booking.student_id,
        tutorStudentId: null,
        status: 'absent' as const,
        note: '',
      }]
    })
    const manualEntries = tutorStudentIds.flatMap((id) => {
      const student = tutorStudents.find((item) => item.id === id && item.status === 'active')
      if (!student) return []
      const key = `manual:${student.id}`
      return [currentByKey.get(key) ?? {
        key,
        studentId: null,
        tutorStudentId: student.id,
        status: 'absent' as const,
        note: '',
      }]
    })
    return [...bookingEntries, ...manualEntries]
  }

  function toggleBooking(booking: TuitionBooking) {
    setNotice('')
    const next = selectedTuitionIds.includes(booking.id)
      ? selectedTuitionIds.filter((id) => id !== booking.id)
      : [...selectedTuitionIds, booking.id]
    setSelectedTuitionIds(next)
    setRoster((current) => buildRoster(next, selectedTutorStudentIds, current))
  }

  function toggleManualStudent(student: TutorStudent) {
    setNotice('')
    const next = selectedTutorStudentIds.includes(student.id)
      ? selectedTutorStudentIds.filter((id) => id !== student.id)
      : [...selectedTutorStudentIds, student.id]
    setSelectedTutorStudentIds(next)
    setRoster((current) => buildRoster(selectedTuitionIds, next, current))
  }

  function editSession(session: AttendanceSession) {
    const selected = uniqueBookings.filter((booking) => session.tuitionIds.includes(booking.id))
    const selectedManualIds = session.records
      .flatMap((record) => record.tutor_student_id ? [record.tutor_student_id] : [])
      .filter((id) => tutorStudents.some((student) => student.id === id && student.status === 'active'))
    const sessionRoster = buildRoster(
      selected.map((booking) => booking.id),
      selectedManualIds,
      [],
    ).map((entry) => {
      const record = session.records.find((item) => (
        entry.studentId
          ? item.student_id === entry.studentId
          : item.tutor_student_id === entry.tutorStudentId
      ))
      return { ...entry, status: record?.status ?? 'absent', note: record?.note ?? '' }
    })
    setEditingSessionId(session.id)
    setSelectedTuitionIds(selected.map((booking) => booking.id))
    setSelectedTutorStudentIds(selectedManualIds)
    setSessionDate(session.session_date)
    setStartTime(session.start_time.slice(0, 5))
    setEndTime(session.end_time?.slice(0, 5) ?? '')
    setTopic(session.topic)
    setRoster(sessionRoster)
    setNotice('')
    setError('')
    document.getElementById('attendance')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function setStudentStatus(key: string, status: AttendanceStatus) {
    setRoster((current) => current.map((entry) => (
      entry.key === key ? { ...entry, status } : entry
    )))
  }

  function setStudentNote(key: string, note: string) {
    setRoster((current) => current.map((entry) => (
      entry.key === key ? { ...entry, note } : entry
    )))
  }

  function markEveryonePresent() {
    setRoster((current) => current.map((entry) => ({ ...entry, status: 'present' })))
  }

  async function addStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setAddingStudent(true)
    try {
      const accessToken = await getAccessToken()
      const response = await fetch('/api/attendance/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          displayName: studentName,
          classLevel: studentClass,
          subject: studentSubject,
          phone: studentPhone,
        }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'শিক্ষার্থী যোগ করা যায়নি')
      setStudentName('')
      setStudentClass('')
      setStudentSubject('')
      setStudentPhone('')
      setNotice('শিক্ষার্থী যোগ করা হয়েছে')
      await loadAttendance()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'শিক্ষার্থী যোগ করা যায়নি')
    } finally {
      setAddingStudent(false)
    }
  }

  async function createInvite(studentId: string) {
    setError('')
    setNotice('')
    setInviteActionId(studentId)
    try {
      const accessToken = await getAccessToken()
      const response = await fetch(`/api/attendance/students/${studentId}/invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const result = await response.json() as {
        invite?: { id: string; url: string; expiresAt: string }
        error?: string
      }
      if (!response.ok || !result.invite) {
        throw new Error(result.error || 'আমন্ত্রণ লিংক তৈরি করা যায়নি')
      }
      const createdInvite = result.invite
      setInvites((current) => [
        {
          id: createdInvite.id,
          tutor_student_id: studentId,
          expires_at: createdInvite.expiresAt,
          used_at: null,
          created_at: new Date().toISOString(),
        },
        ...current.filter((invite) => invite.tutor_student_id !== studentId),
      ])
      setInviteLinks((current) => ({
        ...current,
        [studentId]: { url: createdInvite.url, expiresAt: createdInvite.expiresAt },
      }))
      setNotice('আমন্ত্রণ লিংক তৈরি হয়েছে')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'আমন্ত্রণ লিংক তৈরি করা যায়নি')
    } finally {
      setInviteActionId(null)
    }
  }

  async function copyInvite(studentId: string) {
    const invite = inviteLinks[studentId]
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.url)
      setNotice('আমন্ত্রণ লিংক কপি করা হয়েছে')
    } catch {
      setError('লিংক কপি করা যায়নি। লিংকটি নির্বাচন করে কপি করুন।')
    }
  }

  async function revokeInvite(studentId: string) {
    setError('')
    setNotice('')
    setInviteActionId(studentId)
    try {
      const accessToken = await getAccessToken()
      const response = await fetch(`/api/attendance/students/${studentId}/invite`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'আমন্ত্রণ প্রত্যাহার করা যায়নি')
      setInvites((current) => current.filter((invite) => invite.tutor_student_id !== studentId))
      setInviteLinks((current) => {
        const next = { ...current }
        delete next[studentId]
        return next
      })
      setNotice('আমন্ত্রণ প্রত্যাহার করা হয়েছে')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'আমন্ত্রণ প্রত্যাহার করা যায়নি')
    } finally {
      setInviteActionId(null)
    }
  }

  async function saveAttendance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!selectedTuitionIds.length && !selectedTutorStudentIds.length) {
      setError('কমপক্ষে একজন শিক্ষার্থী নির্বাচন করুন')
      return
    }
    if (!startTime) {
      setError('ক্লাসের শুরুর সময় দিন')
      return
    }
    if (endTime && endTime <= startTime) {
      setError('শেষের সময় শুরুর সময়ের পরে হতে হবে')
      return
    }

    setSaving(true)
    try {
      const accessToken = await getAccessToken()
      const response = await fetch('/api/attendance', {
        method: editingSessionId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId: editingSessionId,
          tuitionIds: selectedTuitionIds,
          tutorStudentIds: selectedTutorStudentIds,
          sessionDate,
          startTime,
          endTime: endTime || null,
          topic,
          records: roster.map((entry) => ({
            studentId: entry.studentId,
            tutorStudentId: entry.tutorStudentId,
            status: entry.status,
            note: entry.note.trim() || null,
          })),
        }),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || 'উপস্থিতি সংরক্ষণ করা যায়নি')
      clearForm()
      setNotice('উপস্থিতি সংরক্ষণ করা হয়েছে')
      await loadAttendance()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'উপস্থিতি সংরক্ষণ করা যায়নি')
    } finally {
      setSaving(false)
    }
  }

  const bookingByStudent = new Map(uniqueBookings.map((booking) => [booking.student_id, booking]))
  const tutorStudentById = new Map(tutorStudents.map((student) => [student.id, student]))
  const activeInvitesByStudent = new Map<string, AttendanceInvite>()
  invites.forEach((invite) => {
    if (
      !invite.used_at
      && new Date(invite.expires_at).getTime() > Date.now()
      && !activeInvitesByStudent.has(invite.tutor_student_id)
    ) {
      activeInvitesByStudent.set(invite.tutor_student_id, invite)
    }
  })

  return (
    <div id="attendance" className="scroll-mt-24">
      <Card title="উপস্থিতি" hint="বুকিং করা ও নিজে যুক্ত করা শিক্ষার্থীদের ক্লাসভিত্তিক উপস্থিতি নিন।">
        {loading ? (
          <div className="h-28 animate-pulse rounded-xl bg-slate-100" aria-label="লোড হচ্ছে" />
        ) : (
          <>
            {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
            {notice && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800" role="status">{notice}</p>}

            <form onSubmit={(event) => void addStudent(event)} className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <h3 className="mb-3 font-bold text-gray-900">শিক্ষার্থী যুক্ত করুন</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-semibold text-gray-800">
                  নাম
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={studentName}
                    onChange={(event) => setStudentName(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold text-gray-800">
                  ক্লাস
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={studentClass}
                    onChange={(event) => setStudentClass(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold text-gray-800">
                  বিষয়
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={studentSubject}
                    onChange={(event) => setStudentSubject(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold text-gray-800">
                  ফোন (ঐচ্ছিক)
                  <input
                    type="tel"
                    maxLength={32}
                    value={studentPhone}
                    onChange={(event) => setStudentPhone(event.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={addingStudent}
                className="mt-3 min-h-11 rounded-xl bg-primary px-5 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingStudent ? 'যোগ হচ্ছে...' : 'শিক্ষার্থী যুক্ত করুন'}
              </button>
            </form>

            {uniqueBookings.length === 0 && tutorStudents.filter((student) => student.status === 'active').length === 0 ? (
              <Empty>উপস্থিতি নিতে কোনো শিক্ষার্থী নির্বাচন করা হয়নি। নতুন শিক্ষার্থী যোগ করুন।</Empty>
            ) : (
              <form onSubmit={(event) => void saveAttendance(event)} className="space-y-5">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-gray-800">শিক্ষার্থী নির্বাচন করুন</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {uniqueBookings.map((booking) => (
                      <label key={booking.id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selectedTuitionIds.includes(booking.id)}
                          onChange={() => toggleBooking(booking)}
                          className="mt-1 h-4 w-4 accent-blue-700"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-gray-900">{booking.name || 'শিক্ষার্থী'}</span>
                          <span className="block text-xs text-gray-500">
                            {[booking.class_level, booking.subject].filter(Boolean).join(' · ') || 'অনুমোদিত টিউশন'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {tutorStudents.filter((student) => student.status === 'active').length > 0 && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-gray-800">নিজে যুক্ত করা শিক্ষার্থী</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {tutorStudents.filter((student) => student.status === 'active').map((student) => {
                        const activeInvite = activeInvitesByStudent.get(student.id)
                        const generatedInvite = inviteLinks[student.id]
                        const isBusy = inviteActionId === student.id
                        return (
                          <div key={student.id} className="min-w-0 rounded-xl border border-slate-200 p-3">
                            <label className="flex min-h-12 cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedTutorStudentIds.includes(student.id)}
                                onChange={() => toggleManualStudent(student)}
                                className="mt-1 h-4 w-4 accent-blue-700"
                              />
                              <span className="min-w-0">
                                <span className="block font-semibold text-gray-900">{student.display_name}</span>
                                <span className="block text-xs text-gray-500">
                                  {[student.class_level, student.subject].join(' · ')}
                                </span>
                              </span>
                            </label>

                            {!student.student_id && (
                              <div className="mt-2 border-t border-slate-100 pt-2">
                                {activeInvite ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-gray-600">
                                      লিংকের মেয়াদ: {new Date(activeInvite.expires_at).toLocaleDateString('bn-BD')}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void revokeInvite(student.id)}
                                      className="min-h-9 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                                    >
                                      লিংক প্রত্যাহার
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void createInvite(student.id)}
                                    className="min-h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
                                  >
                                    {isBusy ? 'তৈরি হচ্ছে...' : 'লিংক পাঠান'}
                                  </button>
                                )}
                                {generatedInvite && (
                                  <div className="mt-2 space-y-2">
                                    <p className="text-xs text-gray-600">
                                      মেয়াদ শেষ: {new Date(generatedInvite.expiresAt).toLocaleDateString('bn-BD')}
                                    </p>
                                    <div className="flex gap-2">
                                      <input
                                        readOnly
                                        aria-label={`${student.display_name}-এর আমন্ত্রণ লিংক`}
                                        value={generatedInvite.url}
                                        className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => void copyInvite(student.id)}
                                        className="min-h-9 shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                                      >
                                        কপি
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </fieldset>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm font-semibold text-gray-800">
                    তারিখ
                    <input
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(event) => setSessionDate(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-800">
                    শুরুর সময়
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-800">
                    শেষের সময় (ঐচ্ছিক)
                    <input
                      type="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-800">
                    বিষয় / টপিক
                    <input
                      type="text"
                      maxLength={300}
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      placeholder="যেমন: বীজগণিত"
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal"
                    />
                  </label>
                </div>

                {roster.length > 0 && (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-gray-900">রোল-কল</h3>
                      <button
                        type="button"
                        onClick={markEveryonePresent}
                        className="min-h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        সবাই উপস্থিত
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {roster.map((entry) => {
                        const booking = entry.studentId ? bookingByStudent.get(entry.studentId) : null
                        const manualStudent = entry.tutorStudentId ? tutorStudentById.get(entry.tutorStudentId) : null
                        const name = booking?.name || manualStudent?.display_name || 'শিক্ষার্থী'
                        return (
                          <li key={entry.key} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                            <p className="mb-3 font-semibold text-gray-900">{name}</p>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label={`${name}-এর উপস্থিতির অবস্থা`}>
                              {STATUS_OPTIONS.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  aria-pressed={entry.status === option.value}
                                  onClick={() => setStudentStatus(entry.key, option.value)}
                                  className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold ${entry.status === option.value ? option.style : 'border-slate-200 bg-white text-gray-600'}`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                            <label className="mt-3 block text-xs font-semibold text-gray-600">
                              নোট (ঐচ্ছিক)
                              <input
                                type="text"
                                maxLength={500}
                                value={entry.note}
                                onChange={(event) => setStudentNote(entry.key, event.target.value)}
                                className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal"
                              />
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={saving || (!selectedTuitionIds.length && !selectedTutorStudentIds.length)}
                    className="min-h-11 rounded-xl bg-primary px-5 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'সংরক্ষণ হচ্ছে...' : editingSessionId ? 'পরিবর্তন সংরক্ষণ করুন' : 'উপস্থিতি সংরক্ষণ করুন'}
                  </button>
                  {editingSessionId && (
                    <button
                      type="button"
                      onClick={clearForm}
                      className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-gray-700"
                    >
                      সম্পাদনা বাতিল
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="mt-8 border-t border-slate-100 pt-6">
              <h3 className="mb-3 font-bold text-gray-900">আগের ক্লাস</h3>
              {sessions.length === 0 ? (
                <Empty>এখনো কোনো ক্লাস রেকর্ড করা হয়নি</Empty>
              ) : (
                <ul className="space-y-3">
                  {sessions.map((session) => {
                    const names = session.records.map((record) => {
                      if (record.student_id) return bookingByStudent.get(record.student_id)?.name || 'শিক্ষার্থী'
                      if (record.tutor_student_id) {
                        return tutorStudentById.get(record.tutor_student_id)?.display_name || 'শিক্ষার্থী'
                      }
                      return 'শিক্ষার্থী'
                    })
                    return (
                      <li key={session.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900">{displayDate(session.session_date)}</p>
                            <p className="mt-1 text-sm text-gray-600">
                              {displayTime(session.start_time)}{session.end_time ? `–${displayTime(session.end_time)}` : ''}
                              {session.topic ? ` · ${session.topic}` : ''}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">{names.join(', ') || 'শিক্ষার্থী নির্বাচন করা হয়নি'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => editSession(session)}
                            className="min-h-10 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-primary hover:bg-blue-50"
                          >
                            সম্পাদনা
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {session.records.map((record, index) => {
                            const status = STATUS_OPTIONS.find((option) => option.value === record.status)
                            const studentName = record.student_id
                              ? bookingByStudent.get(record.student_id)?.name || 'শিক্ষার্থী'
                              : record.tutor_student_id
                                ? tutorStudentById.get(record.tutor_student_id)?.display_name || 'শিক্ষার্থী'
                                : 'শিক্ষার্থী'
                            return (
                              <span key={record.student_id || record.tutor_student_id || index} className={`rounded-full border px-3 py-1 text-xs font-semibold ${status?.style ?? ''}`}>
                                {studentName}: {status?.label ?? record.status}
                              </span>
                            )
                          })}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
