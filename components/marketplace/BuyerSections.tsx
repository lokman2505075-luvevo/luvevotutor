'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'

type BuyerOrder = {
  id: string
  product_id: string
  product_title: string
  product_type: 'physical' | 'digital'
  seller_label: string
  quantity: number
  amount: number
  payment_method: string
  payment_status: string
  order_status: string
  fulfillment_method: string | null
  pickup_location: string | null
  delivery_address: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'অপেক্ষমাণ',
  confirmed: 'নিশ্চিত',
  shipped: 'পাঠানো হয়েছে',
  delivered: 'পৌঁছে গেছে',
  completed: 'সম্পন্ন',
  cancelled: 'বাতিল',
}

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'পেমেন্ট বাকি',
  verification_pending: 'পেমেন্ট যাচাই হচ্ছে',
  paid: 'পেমেন্ট সম্পন্ন',
  failed: 'পেমেন্ট ব্যর্থ',
  refunded: 'ফেরত দেওয়া হয়েছে',
}

function taka(value: number) {
  return `৳${Number(value).toLocaleString('bn-BD')}`
}

function useBuyerOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<BuyerOrder[]>([])
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    if (!user) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      supabase
        .from('marketplace_buyer_orders')
        .select('id, product_id, product_title, product_type, seller_label, quantity, amount, payment_method, payment_status, order_status, fulfillment_method, pickup_location, delivery_address, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('marketplace_reviews').select('order_id').eq('buyer_id', user.id),
    ]).then(([orderResult, reviewResult]) => {
        if (!active) return
        if (orderResult.error || reviewResult.error) setError('কেনাকাটার তথ্য লোড করা যায়নি')
        else {
          setOrders((orderResult.data ?? []) as BuyerOrder[])
          setReviewedOrderIds(new Set((reviewResult.data ?? []).map((review) => review.order_id)))
        }
        setLoading(false)
      })

    return () => { active = false }
  }, [user?.id, refreshKey])

  return { orders, reviewedOrderIds, loading, error, reload: () => setRefreshKey((value) => value + 1) }
}

export function MarketplaceBuyerOrders() {
  const { orders, reviewedOrderIds, loading, error, reload } = useBuyerOrders()
  const [reviewingOrder, setReviewingOrder] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyOrder, setBusyOrder] = useState<string | null>(null)

  async function completeOrder(orderId: string) {
    setBusyOrder(orderId)
    setActionError('')
    const { error: completeError } = await supabase.rpc('marketplace_complete_order', { target_order_id: orderId })
    if (completeError) setActionError('অর্ডার সম্পন্ন করা যায়নি')
    else reload()
    setBusyOrder(null)
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault()
    setBusyOrder(orderId)
    setActionError('')
    const { error: reviewError } = await supabase.rpc('marketplace_submit_review', {
      target_order_id: orderId,
      review_rating: Number(reviewRating),
      review_comment: reviewComment.trim(),
    })
    if (reviewError) setActionError('রিভিউ জমা দেওয়া যায়নি। অর্ডারের অবস্থা যাচাই করে আবার চেষ্টা করুন।')
    else {
      setReviewingOrder(null)
      setReviewComment('')
      reload()
    }
    setBusyOrder(null)
  }

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6">
      <h2 className="text-xl font-bold text-primary">আমার ক্রয়</h2>
      {loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-gray-100" />
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>
      ) : orders.length === 0 ? (
        <div className="mt-4 rounded-xl bg-gray-50 p-6 text-center">
          <p className="text-gray-600">এখনো কোনো পণ্য কেনা হয়নি।</p>
          <Link href="/educational-product" className="mt-3 inline-flex rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-amber-600">
            মার্কেটপ্লেস দেখুন
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/educational-product/${order.product_id}`} className="font-semibold text-primary hover:underline">
                    {order.product_title}
                  </Link>
                  <p className="mt-1 text-sm text-gray-500">
                    বিক্রেতা: {order.seller_label} · {new Date(order.created_at).toLocaleDateString('bn-BD')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{taka(order.amount)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                    order.order_status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.order_status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {STATUS_LABELS[order.order_status] ?? order.order_status}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>পরিমাণ: {order.quantity.toLocaleString('bn-BD')}</span>
                <span>পেমেন্ট: {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}</span>
                {order.product_type === 'physical' && order.fulfillment_method === 'pickup' && order.pickup_location && (
                  <span>পিকআপ: {order.pickup_location}</span>
                )}
                {order.product_type === 'physical' && order.fulfillment_method === 'delivery' && order.delivery_address && (
                  <span>ডেলিভারি ঠিকানা: {order.delivery_address}</span>
                )}
              </div>
              {order.product_type === 'physical' && (
                <div className="mt-3 flex flex-wrap gap-1 text-xs">
                  {['pending', 'confirmed', 'shipped', 'delivered', 'completed'].map((status) => {
                    const currentIndex = ['pending', 'confirmed', 'shipped', 'delivered', 'completed'].indexOf(order.order_status)
                    const stepIndex = ['pending', 'confirmed', 'shipped', 'delivered', 'completed'].indexOf(status)
                    return (
                      <span key={status} className={`rounded-full px-2 py-1 ${
                        stepIndex <= currentIndex ? 'bg-sky-100 text-sky-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {STATUS_LABELS[status]}
                      </span>
                    )
                  })}
                </div>
              )}
              {order.product_type === 'physical' && order.order_status === 'delivered' && (
                <button
                  type="button"
                  disabled={busyOrder === order.id}
                  onClick={() => void completeOrder(order.id)}
                  className="mt-3 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {busyOrder === order.id ? 'আপডেট হচ্ছে...' : 'অর্ডার সম্পন্ন হয়েছে'}
                </button>
              )}
              {order.order_status === 'completed' && !reviewedOrderIds.has(order.id) && (
                reviewingOrder === order.id ? (
                  <form onSubmit={(event) => void submitReview(event, order.id)} className="mt-4 space-y-3 rounded-lg bg-gray-50 p-3">
                    <label className="block text-sm font-medium text-gray-700">
                      রেটিং
                      <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2">
                        {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} ★</option>)}
                      </select>
                    </label>
                    <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} maxLength={1000} rows={3} placeholder="আপনার অভিজ্ঞতা লিখুন (ঐচ্ছিক)" className="w-full rounded-lg border border-gray-300 p-3" />
                    <div className="flex gap-2">
                      <button type="submit" disabled={busyOrder === order.id} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">রিভিউ জমা দিন</button>
                      <button type="button" onClick={() => setReviewingOrder(null)} className="rounded-lg border px-4 py-2 text-sm">বাতিল</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setReviewingOrder(order.id)} className="mt-3 rounded-lg border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">
                    রিভিউ দিন
                  </button>
                )
              )}
            </article>
          ))}
        </div>
      )}
      {actionError && <p role="alert" className="mt-3 text-sm text-red-600">{actionError}</p>}
    </section>
  )
}

export function MarketplaceDigitalProducts() {
  const { orders, loading, error } = useBuyerOrders()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState('')

  async function download(orderId: string) {
    setDownloading(orderId)
    setDownloadError('')
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) throw new Error('ডাউনলোড করতে লগইন করুন')

      const response = await fetch('/api/marketplace/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'ডাউনলোড লিংক তৈরি করা যায়নি')
      window.location.assign(result.downloadUrl)
    } catch (downloadFailure) {
      setDownloadError(downloadFailure instanceof Error ? downloadFailure.message : 'ডাউনলোড করা যায়নি')
    } finally {
      setDownloading(null)
    }
  }

  const digitalOrders = orders.filter((order) => order.product_type === 'digital')

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6">
      <h2 className="text-xl font-bold text-primary">আমার ডিজিটাল পণ্য</h2>
      <p className="mt-1 text-sm text-gray-500">পেমেন্ট নিশ্চিত হওয়া ডিজিটাল পণ্য এখান থেকে ডাউনলোড করুন।</p>
      {loading ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-gray-100" />
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>
      ) : digitalOrders.length === 0 ? (
        <p className="mt-4 rounded-xl bg-gray-50 p-6 text-center text-gray-600">এখনো কোনো ডিজিটাল পণ্য কেনা হয়নি।</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {digitalOrders.map((order) => {
            const unlocked = order.payment_status === 'paid' && order.order_status === 'completed'
            return (
              <article key={order.id} className="rounded-xl border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">{order.product_title}</h3>
                <p className="mt-1 text-sm text-gray-500">বিক্রেতা: {order.seller_label}</p>
                <p className="text-sm text-gray-500">কেনার তারিখ: {new Date(order.created_at).toLocaleDateString('bn-BD')}</p>
                <button
                  type="button"
                  disabled={!unlocked || downloading === order.id}
                  onClick={() => void download(order.id)}
                  className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {downloading === order.id ? 'লিংক তৈরি হচ্ছে...' : unlocked ? 'ডাউনলোড করুন' : 'পেমেন্ট নিশ্চিত হলে ডাউনলোড হবে'}
                </button>
              </article>
            )
          })}
        </div>
      )}
      {downloadError && <p role="alert" className="mt-3 text-sm text-red-600">{downloadError}</p>}
    </section>
  )
}
