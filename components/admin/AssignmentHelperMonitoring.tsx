'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { toBengaliDigits } from '../../lib/sohojatri'

type Report = {
  id: string
  helper_id: string
  reporter_id: string
  helper_name: string
  reason: string
  details: string
  status: string
  created_at: string
}
type HelperRequest = {
  id: string
  status: string
  created_at: string
  message: string
  subject: string
  deadline: string
  details: string
  helper_name: string
  requester_name: string
}

export default function AssignmentHelperMonitoring() {
  const [reports, setReports] = useState<Report[]>([])
  const [requests, setRequests] = useState<HelperRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [reportResult, requestResult] = await Promise.all([
      supabase.from('assignment_helper_admin_reports').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('assignment_helper_admin_requests').select('*').order('created_at', { ascending: false }).limit(1000),
    ])
    const failed = reportResult.error ?? requestResult.error
    if (failed) setError(`রিপোর্ট বা অনুরোধ লোড করা যায়নি: ${failed.message}`)
    else {
      setReports((reportResult.data ?? []) as Report[])
      setRequests((requestResult.data ?? []) as HelperRequest[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function resolve(report: Report, decision: 'reviewed' | 'dismissed', suspend: boolean) {
    const reason = suspend ? window.prompt('হেল্পার স্থগিত করার কারণ লিখুন')?.trim() ?? '' : ''
    if (suspend && !reason) return
    setBusyId(report.id)
    setError('')
    setNotice('')
    if (suspend) {
      const { error: suspendError } = await supabase.rpc('assignment_helper_admin_manage', {
        target_helper_id: report.helper_id,
        action: 'suspend',
        reason,
      })
      if (suspendError) {
        setError(`হেল্পার স্থগিত করা যায়নি: ${suspendError.message}`)
        setBusyId('')
        return
      }
    }
    const { error: resolveError } = await supabase.rpc('assignment_helper_admin_resolve_report', {
      target_report_id: report.id,
      decision,
      resolution: suspend ? reason : '',
    })
    setBusyId('')
    if (resolveError) {
      setError(`রিপোর্ট আপডেট করা যায়নি: ${resolveError.message}`)
      return
    }
    setNotice('রিপোর্ট পর্যালোচনা সম্পন্ন হয়েছে')
    await load()
  }

  return <section className="mt-8 space-y-5">
    <header><h2 className="text-xl font-bold text-blue-950">হেল্পার রিপোর্ট ও অনুরোধ</h2><p className="mt-1 text-sm text-gray-600">রিপোর্ট পর্যালোচনা করুন; অনুরোধগুলো শুধু পর্যবেক্ষণের জন্য।</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    {loading ? <div className="animate-pulse space-y-3"><div className="h-20 rounded-xl bg-gray-100" /><div className="h-20 rounded-xl bg-gray-100" /></div> : <>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-blue-950">রিপোর্ট ({toBengaliDigits(reports.filter((item) => item.status === 'open').length)})</h3>
        {reports.filter((item) => item.status === 'open').length === 0 ? <p className="mt-3 text-sm text-gray-500">খোলা কোনো রিপোর্ট নেই।</p> : <div className="mt-4 space-y-3">
          {reports.filter((item) => item.status === 'open').map((report) => <article key={report.id} className="rounded-xl border border-red-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold text-blue-950">{report.helper_name}</h4><p className="mt-1 text-sm text-gray-600">কারণ: {report.reason} · রিপোর্টার আইডি: {report.reporter_id.slice(0, 8)}</p>{report.details && <p className="mt-2 text-sm text-gray-700">{report.details}</p>}</div><span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString('bn-BD')}</span></div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busyId === report.id} onClick={() => void resolve(report, 'reviewed', true)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50">স্থগিত করে রিপোর্ট নিষ্পত্তি</button><button type="button" disabled={busyId === report.id} onClick={() => void resolve(report, 'reviewed', false)} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">পর্যালোচনা সম্পন্ন</button><button type="button" disabled={busyId === report.id} onClick={() => void resolve(report, 'dismissed', false)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">রিপোর্ট বাতিল</button></div>
          </article>)}
        </div>}
      </div>
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-blue-950">সব helper request (শুধু দেখুন)</h3>
        {requests.length === 0 ? <p className="mt-3 text-sm text-gray-500">কোনো অনুরোধ নেই।</p> : <div className="mt-4 space-y-3">
          {requests.map((request) => <article key={request.id} className="rounded-xl border border-gray-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold text-blue-950">{request.subject}</h4><p className="mt-1 text-sm text-gray-600">Requester: {request.requester_name} · হেল্পার: {request.helper_name} · অবস্থা: {request.status} · Deadline: {toBengaliDigits(new Date(`${request.deadline}T00:00:00`).toLocaleDateString('bn-BD'))}</p></div><span className="text-xs text-gray-500">{new Date(request.created_at).toLocaleDateString('bn-BD')}</span></div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{request.details}</p>{request.message && <p className="mt-2 text-sm text-gray-600">বার্তা: {request.message}</p>}
          </article>)}
        </div>}
      </div>
    </>}
  </section>
}
