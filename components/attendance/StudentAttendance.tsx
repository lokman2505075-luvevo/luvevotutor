'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { Card, Empty } from '../profile/ui'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

type StudentAttendanceRecord = {
  session_id: string
  status: AttendanceStatus
  note: string | null
  marked_at: string
  session: {
    session_date: string
    start_time: string
    end_time: string | null
    topic: string
    tutor_id: string
    tutor_name: string
  }
}

const STATUS_LABEL: Record<AttendanceStatus, { label: string; style: string }> = {
  present: { label: 'উপস্থিত', style: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  absent: { label: 'অনুপস্থিত', style: 'bg-red-50 text-red-800 ring-red-200' },
  late: { label: 'দেরি', style: 'bg-amber-50 text-amber-800 ring-amber-200' },
  excused: { label: 'ছুটি', style: 'bg-sky-50 text-sky-800 ring-sky-200' },
}

function displayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
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

export default function StudentAttendance() {
  const router = useRouter()
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [month, setMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadAttendance() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.access_token) {
          router.replace('/login?next=/my-courses%23attendance')
          return
        }

        const response = await fetch('/api/attendance/student', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const result = await response.json() as {
          records?: StudentAttendanceRecord[]
          error?: string
        }
        if (!response.ok) throw new Error(result.error || 'উপস্থিতির তথ্য লোড করা যায়নি')
        if (!cancelled) setRecords(result.records ?? [])
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'উপস্থিতির তথ্য লোড করা যায়নি')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAttendance()
    return () => { cancelled = true }
  }, [router])

  const teachers = useMemo(() => {
    const unique = new Map<string, string>()
    records.forEach((record) => unique.set(record.session.tutor_id, record.session.tutor_name))
    return Array.from(unique, ([id, name]) => ({ id, name }))
  }, [records])

  const filteredRecords = useMemo(() => records
    .filter((record) => (
      (!teacherId || record.session.tutor_id === teacherId)
      && (!month || record.session.session_date.startsWith(`${month}-`))
    ))
    .sort((first, second) => (
      second.session.session_date.localeCompare(first.session.session_date)
      || second.session.start_time.localeCompare(first.session.start_time)
    )), [month, records, teacherId])

  const present = filteredRecords.filter((record) => record.status === 'present').length
  const absent = filteredRecords.filter((record) => record.status === 'absent').length
  const late = filteredRecords.filter((record) => record.status === 'late').length
  const percentage = filteredRecords.length
    ? Math.round(((present + late) / filteredRecords.length) * 100)
    : 0

  function resetFilters() {
    setTeacherId('')
    setMonth('')
  }

  return (
    <div id="attendance" className="scroll-mt-24">
      <Card title="আমার উপস্থিতি" hint="আপনার ক্লাসের উপস্থিতির তথ্য শুধু আপনিই দেখতে পারবেন।">
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-label="লোড হচ্ছে" />
        ) : (
          <>
            {error && (
              <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
                {error}
              </p>
            )}

            {records.length === 0 && !error ? (
              <Empty>এখনো কোনো ক্লাস রেকর্ড করা হয়নি</Empty>
            ) : records.length > 0 ? (
              <>
                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard label="মোট ক্লাস" value={filteredRecords.length} />
                  <SummaryCard label="উপস্থিত" value={present} style="text-emerald-700" />
                  <SummaryCard label="অনুপস্থিত" value={absent} style="text-red-700" />
                  <SummaryCard label="শতাংশ" value={`${percentage}%`} style="text-blue-800" />
                </div>

                <div className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <label className="text-sm font-semibold text-gray-700">
                    শিক্ষক
                    <select
                      value={teacherId}
                      onChange={(event) => setTeacherId(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3"
                    >
                      <option value="">সব শিক্ষক</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-gray-700">
                    মাস
                    <input
                      type="month"
                      value={month}
                      onChange={(event) => setMonth(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={!teacherId && !month}
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-50"
                  >
                    ফিল্টার মুছুন
                  </button>
                </div>

                {filteredRecords.length === 0 ? (
                  <Empty>এই শিক্ষক ও মাসে কোনো ক্লাস রেকর্ড করা হয়নি</Empty>
                ) : (
                  <ol className="space-y-3">
                    {filteredRecords.map((record) => {
                      const status = STATUS_LABEL[record.status]
                      return (
                        <li
                          key={record.session_id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900">{displayDate(record.session.session_date)}</p>
                              <p className="mt-1 text-sm text-gray-600">
                                শিক্ষক: {record.session.tutor_name}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {displayTime(record.session.start_time)}
                                {record.session.end_time ? `–${displayTime(record.session.end_time)}` : ''}
                                {record.session.topic ? ` · ${record.session.topic}` : ''}
                              </p>
                            </div>
                            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ${status.style}`}>
                              {status.label}
                            </span>
                          </div>
                          {record.note && (
                            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-gray-700">
                              নোট: {record.note}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                )}

                {filteredRecords.length > 0 && percentage < 75 && (
                  <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="status">
                    আপনার উপস্থিতির হার কিছুটা কম। নিয়মিত ক্লাসে অংশ নেওয়ার চেষ্টা করুন—প্রয়োজনে আপনার শিক্ষকের সঙ্গে কথা বলুন।
                  </p>
                )}
              </>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}

function SummaryCard({ label, value, style = 'text-gray-900' }: { label: string; value: number | string; style?: string }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('bn-BD') : value
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${style}`}>{displayValue}</p>
    </div>
  )
}
