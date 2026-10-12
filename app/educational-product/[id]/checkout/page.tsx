'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '../../../../components/Navbar'
import Footer from '../../../../components/Footer'
import { supabase } from '../../../../lib/supabaseClient'
import { useAuth } from '../../../../lib/AuthContext'

type CheckoutProduct = {
  id: string
  title: string
  seller_type: 'platform' | 'tutor' | 'student'
  type: 'physical' | 'digital'
  price: number
  stock: number
  pickup_location: string | null
  delivery_available: boolean
  is_owner: boolean
}

function toNumber(value: string) {
  return Number(value.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit))).replace(/[٬,]/g, ''))
}

function formatPrice(value: number) {
  return `৳${new Intl.NumberFormat('bn-BD').format(value)}`
}

export default function MarketplaceCheckoutPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [product, setProduct] = useState<CheckoutProduct | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'cod'>('bkash')
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('delivery')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [transactionReference, setTransactionReference] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let active = true
    async function loadProduct() {
      const { data, error: queryError } = await supabase
        .from('public_marketplace_products')
        .select('id, title, seller_type, type, price, stock, pickup_location, delivery_available, is_owner')
        .eq('id', params.id)
        .maybeSingle()
      if (!active) return
      if (queryError) setError('পণ্যের তথ্য লোড করা যায়নি')
      else setProduct(data as CheckoutProduct | null)
      if (data?.type === 'physical' && data.pickup_location && !data.delivery_available) setFulfillment('pickup')
      setLoading(false)
    }
    void loadProduct()
    return () => { active = false }
  }, [params.id])

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')
    if (!user) {
      router.push('/login')
      return
    }
    if (!product || product.stock <= 0 || product.is_owner) return setError('এই পণ্যটি অর্ডার করা যাবে না')
    const parsedQuantity = toNumber(quantity)
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > product.stock) return setError('মজুতের মধ্যে সঠিক পরিমাণ লিখুন')
    if (product.type === 'digital' && !process.env.NEXT_PUBLIC_PAYMENT_NUMBER) return setError('অনলাইন পেমেন্ট নম্বর এখনো সেট করা হয়নি। পরে আবার চেষ্টা করুন।')
    if (product.type === 'physical' && fulfillment === 'delivery' && deliveryAddress.trim().length < 5) return setError('ডেলিভারি ঠিকানা ৫ অক্ষরের বেশি লিখুন')

    setSubmitting(true)
    const { data: orderId, error: orderError } = await supabase.rpc('marketplace_create_order', {
      product_id: product.id,
      quantity: parsedQuantity,
      payment_method: product.type === 'digital' ? method : method,
      fulfillment_method: product.type === 'physical' ? fulfillment : null,
      delivery_address: product.type === 'physical' && fulfillment === 'delivery' ? deliveryAddress.trim() : null,
    })
    setSubmitting(false)
    if (orderError) return setError(orderError.message.includes('stock') || orderError.message.includes('Stock') ? 'এই পরিমাণ পণ্য এখন মজুতে নেই। পরিমাণ পরিবর্তন করে চেষ্টা করুন।' : `অর্ডার তৈরি করা যায়নি: ${orderError.message}`)
    setCreatedOrderId(orderId as string)
    if (method === 'cod') setStatus('আপনার ক্যাশ অন ডেলিভারি অর্ডার নিশ্চিত হয়েছে।')
    else setStatus('পেমেন্ট পাঠিয়ে trxID জমা দিন। যাচাই শেষে অর্ডার নিশ্চিত হবে।')
  }

  async function submitReference(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!createdOrderId) return
    setError('')
    if (transactionReference.trim().length < 6) return setError('কমপক্ষে ৬ অক্ষরের সঠিক trxID লিখুন')
    setSubmitting(true)
    const { error: referenceError } = await supabase.rpc('marketplace_submit_payment_reference', {
      order_id: createdOrderId,
      transaction_reference: transactionReference.trim(),
    })
    setSubmitting(false)
    if (referenceError) return setError(`trxID জমা দেওয়া যায়নি: ${referenceError.message}`)
    setStatus('trxID জমা হয়েছে। অ্যাডমিন যাচাই করলে অর্ডারের অবস্থা আপডেট হবে।')
  }

  const paymentNumber = process.env.NEXT_PUBLIC_PAYMENT_NUMBER

  return <div className="min-h-screen bg-slate-50 text-gray-900">
    <Navbar />
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/educational-product/${params.id}`} className="text-sm font-semibold text-primary hover:underline">← পণ্যে ফিরুন</Link>
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-primary">অর্ডার সম্পন্ন করুন</h1>
        {loading || authLoading ? <div className="mt-6 h-28 animate-pulse rounded-xl bg-slate-100" /> : !product ? <p className="mt-5 text-slate-600">{error || 'পণ্যটি পাওয়া যায়নি'}</p> : createdOrderId ? <div className="mt-5 space-y-4">
          <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{status}</p>
          <p className="text-sm text-slate-600">অর্ডার নম্বর: <span className="font-mono font-semibold">{createdOrderId}</span></p>
          {method !== 'cod' && <><div className="rounded-xl bg-blue-50 p-4 leading-7 text-blue-950">১. বিক্রেতাকে {formatPrice(Number(product.price) * toNumber(quantity))} {method === 'bkash' ? 'বিকাশ' : 'নগদ'}-এ পাঠান।<br />২. পেমেন্টের trxID নিচে লিখে জমা দিন।<br />৩. অ্যাডমিন যাচাই করলে অর্ডার নিশ্চিত হবে।<p className="mt-2 font-bold">{paymentNumber ? `পেমেন্ট নম্বর: ${paymentNumber}` : 'পেমেন্ট নম্বর পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।'}</p></div>
            {paymentNumber && <form onSubmit={(event) => void submitReference(event)} className="space-y-3"><label className="block text-sm font-semibold text-slate-700">পেমেন্ট trxID<input required minLength={6} maxLength={80} value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100" /></label><button type="submit" disabled={submitting} className="rounded-xl bg-accent px-5 py-2.5 font-bold text-white hover:bg-amber-600 disabled:opacity-50">{submitting ? 'জমা হচ্ছে…' : 'trxID জমা দিন'}</button></form>}
          </>}
          <Link href="/profile" className="inline-flex rounded-xl border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-blue-50">আমার প্রোফাইলে অর্ডার দেখুন</Link>
        </div> : <><div className="mt-5 rounded-xl border border-slate-100 p-4"><h2 className="font-bold text-slate-900">{product.title}</h2><p className="mt-1 text-sm text-slate-600">একক দাম: {formatPrice(Number(product.price))} · মজুত: {new Intl.NumberFormat('bn-BD').format(product.stock)}</p></div>
          {!user ? <div className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-900"><p>অর্ডার করতে আগে লগইন করুন।</p><Link href="/login" className="mt-3 inline-flex rounded-lg bg-accent px-4 py-2 font-bold text-white">লগইন করুন</Link></div> : product.is_owner ? <p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-900">নিজের পণ্য নিজে কেনা যাবে না।</p> : product.stock <= 0 ? <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">স্টক শেষ</p> : <form onSubmit={(event) => void createOrder(event)} className="mt-5 space-y-5">
            <label className="block text-sm font-semibold text-slate-700">পরিমাণ<input type="text" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100" /></label>
            {product.type === 'physical' && <div><p className="mb-2 text-sm font-semibold text-slate-700">পণ্য গ্রহণের পদ্ধতি</p><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2"><input type="radio" name="fulfillment" checked={fulfillment === 'delivery'} disabled={!product.delivery_available} onChange={() => setFulfillment('delivery')} />ডেলিভারি</label><label className="flex items-center gap-2"><input type="radio" name="fulfillment" checked={fulfillment === 'pickup'} disabled={!product.pickup_location} onChange={() => setFulfillment('pickup')} />পিকআপ</label></div>{fulfillment === 'delivery' ? <textarea required minLength={5} maxLength={500} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="ডেলিভারি ঠিকানা লিখুন" rows={3} className="mt-3 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100" /> : <p className="mt-3 text-sm text-slate-600">পিকআপের স্থান: {product.pickup_location}</p>}</div>}
            <div><p className="mb-2 text-sm font-semibold text-slate-700">পেমেন্ট পদ্ধতি</p><div className="flex flex-wrap gap-3"><PaymentOption value="bkash" label="বিকাশ" selected={method === 'bkash'} onChange={() => setMethod('bkash')} /><PaymentOption value="nagad" label="নগদ" selected={method === 'nagad'} onChange={() => setMethod('nagad')} />{product.type === 'physical' && <PaymentOption value="cod" label="ক্যাশ অন ডেলিভারি" selected={method === 'cod'} onChange={() => setMethod('cod')} />}</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="flex justify-between font-semibold"><span>মোট</span><span>{formatPrice(Number(product.price) * toNumber(quantity))}</span></p></div>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-accent px-5 py-3 font-bold text-white hover:bg-amber-600 disabled:opacity-50">{submitting ? 'অর্ডার হচ্ছে…' : 'অর্ডার নিশ্চিত করুন'}</button>
          </form>}
        </>}
        {error && !createdOrderId && product && user && !product.is_owner && product.stock > 0 && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>
    </main>
    <Footer />
  </div>
}

function PaymentOption({ label, selected, onChange }: { value: string; label: string; selected: boolean; onChange: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onChange} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${selected ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200 text-slate-700'}`}>{label}</button>
}
