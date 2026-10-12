'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type AdminOrder = {
  id: string
  product_id: string
  product_title: string
  product_type: 'physical' | 'digital'
  buyer_label: string
  quantity: number
  amount: number
  payment_method: string
  payment_status: string
  payment_reference: string | null
  order_status: string
  created_at: string
}

type MarketplaceReport = {
  id: string
  product_id: string
  reporter_id: string
  reason: string
  details: string
  status: string
  resolution_note: string | null
  created_at: string
  product_title: string
}

type Payout = {
  id: string
  seller_id: string
  amount: number
  status: string
  payout_method: string | null
  created_at: string
  paid_at: string | null
}

type Commission = { seller_type: string; commission_percent: number }

const REASONS: Record<string, string> = {
  copyright: 'কপিরাইট / পাইরেটেড',
  fake: 'নকল পণ্য',
  wrong_info: 'ভুল তথ্য',
  spam: 'স্প্যাম',
  other: 'অন্যান্য',
}

function taka(amount: number) {
  return `৳${Number(amount).toLocaleString('bn-BD')}`
}

export default function MarketplaceOperations() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [reports, setReports] = useState<MarketplaceReport[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [orderResult, reportResult, payoutResult, commissionResult] = await Promise.all([
      supabase.from('marketplace_admin_orders').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('marketplace_reports').select('id, product_id, reporter_id, reason, details, status, resolution_note, created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('seller_payouts').select('id, seller_id, amount, status, payout_method, created_at, paid_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('marketplace_commissions').select('seller_type, commission_percent').order('seller_type'),
    ])

    const failed = orderResult.error || reportResult.error || payoutResult.error || commissionResult.error
    if (failed) {
      setError(`মার্কেটপ্লেস তথ্য লোড করা যায়নি: ${failed.message}`)
      setLoading(false)
      return
    }

    const reportRows = reportResult.data ?? []
    const productIds = Array.from(new Set(reportRows.map((report) => report.product_id)))
    const productsResult = productIds.length
      ? await supabase.from('products').select('id, title').in('id', productIds)
      : { data: [], error: null }
    if (productsResult.error) {
      setError(`রিপোর্টের পণ্য-তথ্য লোড করা যায়নি: ${productsResult.error.message}`)
      setLoading(false)
      return
    }
    const productTitles = new Map((productsResult.data ?? []).map((product) => [product.id, product.title]))

    setOrders((orderResult.data ?? []) as AdminOrder[])
    setReports(reportRows.map((report) => ({
      ...report,
      product_title: productTitles.get(report.product_id) ?? 'পণ্য মুছে ফেলা হয়েছে',
    })) as MarketplaceReport[])
    setPayouts((payoutResult.data ?? []) as Payout[])
    setCommissions((commissionResult.data ?? []) as Commission[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function verifyPayment(order: AdminOrder, decision: 'paid' | 'failed') {
    const action = decision === 'paid' ? 'পেমেন্ট নিশ্চিত' : 'পেমেন্ট বাতিল'
    if (!window.confirm(`${order.product_title} অর্ডারের পেমেন্ট ${action} করবেন?`)) return
    setBusyId(order.id)
    setError('')
    setNotice('')
    const { error: verifyError } = await supabase.rpc('marketplace_admin_verify_payment', {
      target_order_id: order.id,
      decision,
    })
    if (verifyError) setError(`পেমেন্ট আপডেট করা যায়নি: ${verifyError.message}`)
    else {
      setNotice('অর্ডারের পেমেন্ট অবস্থা আপডেট হয়েছে')
      await load()
    }
    setBusyId(null)
  }

  async function updateReport(report: MarketplaceReport, action: 'reviewed' | 'dismissed' | 'remove') {
    const note = action === 'remove'
      ? 'অ্যাডমিন পর্যালোচনার পর তালিকা সরানো হয়েছে'
      : action === 'dismissed'
        ? 'রিপোর্টটি পর্যালোচনা করে গ্রহণ করা হয়নি'
        : window.prompt('অ্যাডমিন নোট / বিক্রেতার জন্য সতর্কবার্তা লিখুন', report.resolution_note ?? '')
    if (note === null) return
    setBusyId(report.id)
    setError('')
    const { error: productError } = action === 'remove'
      ? await supabase.from('products').update({
          status: 'rejected',
          rejection_reason: 'অ্যাডমিন রিপোর্ট পর্যালোচনা করে তালিকাটি সরিয়েছেন',
        }).eq('id', report.product_id)
      : { error: null }
    if (productError) {
      setError(`তালিকা সরানো যায়নি: ${productError.message}`)
      setBusyId(null)
      return
    }
    const { error: reportError } = await supabase
      .from('marketplace_reports')
      .update({
        status: action === 'dismissed' ? 'dismissed' : 'reviewed',
        resolution_note: note,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', report.id)
    if (reportError) setError(`রিপোর্ট আপডেট করা যায়নি: ${reportError.message}`)
    else {
      setNotice(action === 'remove' ? 'তালিকাটি সরানো হয়েছে' : 'রিপোর্ট পর্যালোচনা করে সংরক্ষণ করা হয়েছে')
      await load()
    }
    setBusyId(null)
  }

  async function saveCommission(sellerType: string, value: number) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setError('কমিশন ০ থেকে ১০০ শতাংশের মধ্যে হতে হবে')
      return
    }
    setBusyId(sellerType)
    setError('')
    const { error: saveError } = await supabase
      .from('marketplace_commissions')
      .update({ commission_percent: value, updated_at: new Date().toISOString() })
      .eq('seller_type', sellerType)
    if (saveError) setError(`কমিশন সংরক্ষণ করা যায়নি: ${saveError.message}`)
    else {
      setNotice('কমিশন সেটিং সংরক্ষণ হয়েছে')
      await load()
    }
    setBusyId(null)
  }

  async function markPayoutPaid(payout: Payout) {
    if (!window.confirm(`${taka(payout.amount)} পেআউট পরিশোধিত হিসেবে চিহ্নিত করবেন?`)) return
    setBusyId(payout.id)
    setError('')
    const { error: payoutError } = await supabase
      .from('seller_payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payout.id)
      .eq('status', 'pending')
    if (payoutError) setError(`পেআউট আপডেট করা যায়নি: ${payoutError.message}`)
    else {
      setNotice('পেআউট পরিশোধিত হিসেবে চিহ্নিত হয়েছে')
      await load()
    }
    setBusyId(null)
  }

  if (loading) return <div className="space-y-4"><div className="h-28 animate-pulse rounded-xl bg-gray-200" /><div className="h-48 animate-pulse rounded-xl bg-gray-200" /></div>

  return <div className="space-y-8">
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

    <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-primary">অর্ডার ও পেমেন্ট যাচাই</h2>
      {orders.length === 0 ? <p className="mt-4 text-sm text-gray-500">কোনো অর্ডার নেই।</p> : <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600"><tr><th className="p-3">পণ্য / ক্রেতা</th><th className="p-3">পরিমাণ</th><th className="p-3">পেমেন্ট</th><th className="p-3">অর্ডার</th><th className="p-3">অ্যাকশন</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id} className="border-b last:border-0">
            <td className="p-3"><p className="font-semibold">{order.product_title}</p><p className="text-xs text-gray-500">{order.buyer_label} · {new Date(order.created_at).toLocaleDateString('bn-BD')}</p></td>
            <td className="p-3">{taka(order.amount)}</td>
            <td className="p-3"><span className="uppercase">{order.payment_method}</span><p className="text-xs text-gray-500">{order.payment_status}</p>{order.payment_reference && <p className="font-mono text-xs">{order.payment_reference}</p>}</td>
            <td className="p-3">{order.order_status}</td>
            <td className="p-3">{order.payment_status === 'verification_pending' ? <div className="flex gap-2">
              <button type="button" disabled={busyId === order.id} onClick={() => void verifyPayment(order, 'paid')} className="rounded bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">পেমেন্ট নিশ্চিত</button>
              <button type="button" disabled={busyId === order.id} onClick={() => void verifyPayment(order, 'failed')} className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">বাতিল</button>
            </div> : <span className="text-xs text-gray-400">—</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>

    <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-primary">রিপোর্ট ও বিরোধ</h2>
      {reports.length === 0 ? <p className="mt-4 text-sm text-gray-500">কোনো রিপোর্ট নেই।</p> : <div className="mt-4 space-y-3">
        {reports.map((report) => <article key={report.id} className="rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-semibold">{report.product_title}</h3><p className="mt-1 text-sm text-red-700">{REASONS[report.reason] ?? report.reason} · {report.status}</p><p className="text-xs text-gray-500">রিপোর্ট: {new Date(report.created_at).toLocaleDateString('bn-BD')}</p></div>
            {report.status === 'open' && <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busyId === report.id} onClick={() => void updateReport(report, 'reviewed')} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50">নোট / সতর্কবার্তা</button>
              <button type="button" disabled={busyId === report.id} onClick={() => void updateReport(report, 'dismissed')} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50">রিপোর্ট খারিজ</button>
              <button type="button" disabled={busyId === report.id} onClick={() => void updateReport(report, 'remove')} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700">তালিকা সরান</button>
            </div>}
          </div>
          {report.details && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{report.details}</p>}
          {report.resolution_note && <p className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-600">অ্যাডমিন নোট: {report.resolution_note}</p>}
        </article>)}
      </div>}
    </section>

    <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-primary">বিক্রেতা কমিশন</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {commissions.map((commission) => <CommissionEditor key={commission.seller_type} commission={commission} busy={busyId === commission.seller_type} onSave={saveCommission} />)}
      </div>
    </section>

    <section className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-bold text-primary">পেআউট ব্যবস্থাপনা</h2>
      {payouts.length === 0 ? <p className="mt-4 text-sm text-gray-500">কোনো পেআউট রেকর্ড নেই।</p> : <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600"><tr><th className="p-3">বিক্রেতা</th><th className="p-3">পরিমাণ</th><th className="p-3">অবস্থা</th><th className="p-3">তারিখ</th><th className="p-3">অ্যাকশন</th></tr></thead>
          <tbody>{payouts.map((payout) => <tr key={payout.id} className="border-b last:border-0">
            <td className="p-3 font-mono text-xs">{payout.seller_id.slice(0, 8)}</td>
            <td className="p-3">{taka(payout.amount)}</td>
            <td className="p-3">{payout.status}</td>
            <td className="p-3">{new Date(payout.created_at).toLocaleDateString('bn-BD')}</td>
            <td className="p-3">{payout.status === 'pending' ? <button type="button" disabled={busyId === payout.id} onClick={() => void markPayoutPaid(payout)} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">পরিশোধিত করুন</button> : payout.paid_at ? new Date(payout.paid_at).toLocaleDateString('bn-BD') : '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </div>
}

function CommissionEditor({
  commission,
  busy,
  onSave,
}: {
  commission: Commission
  busy: boolean
  onSave: (sellerType: string, value: number) => Promise<void>
}) {
  const [value, setValue] = useState(String(commission.commission_percent))
  const labels: Record<string, string> = { platform: 'Luvevo', tutor: 'টিউটর', student: 'শিক্ষার্থী' }
  return <form onSubmit={(event) => { event.preventDefault(); void onSave(commission.seller_type, Number(value)) }} className="rounded-xl bg-gray-50 p-4">
    <label className="block text-sm font-semibold text-gray-700">
      {labels[commission.seller_type] ?? commission.seller_type} কমিশন (%)
      <input type="number" min="0" max="100" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2" />
    </label>
    <button type="submit" disabled={busy} className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">সংরক্ষণ করুন</button>
  </form>
}
