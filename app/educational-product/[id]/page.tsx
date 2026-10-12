'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../lib/AuthContext'

type ProductDetail = {
  id: string
  seller_type: 'platform' | 'tutor' | 'student'
  seller_label: string
  title: string
  description: string
  category: string
  level: string | null
  type: 'physical' | 'digital'
  price: number
  condition: 'new' | 'used' | null
  stock: number
  delivery_available: boolean
  created_at: string
  seller_photo_url: string | null
  seller_rating: number | null
  seller_review_count: number | null
  popularity_count: number
  is_owner: boolean
  pickup_location: string | null
}

type ProductMessage = {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  created_at: string
}

function formatPrice(value: number) {
  return `৳${new Intl.NumberFormat('bn-BD').format(value)}`
}

function sellerBadge(product: ProductDetail) {
  if (product.seller_type === 'platform') return 'Luvevo Official'
  if (product.seller_type === 'tutor') return 'Tutor ✔'
  return 'Student'
}

export default function MarketplaceProductDetailPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id
  const { user } = useAuth()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState('')
  const [messages, setMessages] = useState<ProductMessage[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [messageStatus, setMessageStatus] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('wrong_info')
  const [reportDetails, setReportDetails] = useState('')
  const [reportStatus, setReportStatus] = useState('')
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    let active = true
    async function loadProduct() {
      const { data, error: productError } = await supabase
        .from('public_marketplace_products')
        .select('id, seller_type, seller_label, title, description, category, level, type, price, condition, stock, delivery_available, created_at, seller_photo_url, seller_rating, seller_review_count, popularity_count, is_owner, pickup_location')
        .eq('id', productId)
        .maybeSingle()
      if (!active) return
      if (productError) {
        setError('পণ্যের তথ্য লোড করা যায়নি')
        setLoading(false)
        return
      }
      if (!data) {
        setProduct(null)
        setLoading(false)
        return
      }
      setProduct(data as ProductDetail)
      const { data: imageRows, error: imageError } = await supabase
        .from('product_images')
        .select('storage_path')
        .eq('product_id', productId)
        .order('created_at')
      if (!active) return
      if (imageError) {
        setError('পণ্যের ছবি লোড করা যায়নি')
        setLoading(false)
        return
      }
      const imageUrls = (imageRows ?? []).map((row) => supabase.storage.from('marketplace-images').getPublicUrl(row.storage_path).data.publicUrl)
      setImages(imageUrls)
      setSelectedImage(imageUrls[0] ?? '')
      setLoading(false)
    }

    void loadProduct()
    return () => { active = false }
  }, [productId])

  useEffect(() => {
    if (!productId || !user) {
      setMessages([])
      return
    }
    let active = true
    async function loadMessages() {
      const { data, error: queryError } = await supabase
        .from('marketplace_messages')
        .select('id, sender_id, recipient_id, body, created_at')
        .eq('product_id', productId)
        .order('created_at')
      if (!active) return
      if (queryError) setMessageStatus('বার্তাগুলো লোড করা যায়নি')
      else setMessages((data ?? []) as ProductMessage[])
    }
    void loadMessages()
    return () => { active = false }
  }, [productId, user?.id])

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !product) return
    if (!message.trim()) return setMessageStatus('বার্তা লিখুন')
    setSending(true)
    setMessageStatus('')
    const { error: sendError } = await supabase.rpc('marketplace_send_message', {
      product_id: product.id,
      message_body: message.trim(),
    })
    setSending(false)
    if (sendError) return setMessageStatus('বার্তা পাঠানো যায়নি। আবার চেষ্টা করুন।')
    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      sender_id: user.id,
      recipient_id: '',
      body: message.trim(),
      created_at: new Date().toISOString(),
    }])
    setMessage('')
    setMessageStatus('বার্তাটি বিক্রেতার কাছে পাঠানো হয়েছে')
  }

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !product) return
    setReporting(true)
    setReportStatus('')
    const { error: reportError } = await supabase.rpc('marketplace_report_listing', {
      target_product_id: product.id,
      report_reason: reportReason,
      report_details: reportDetails.trim(),
    })
    setReporting(false)
    if (reportError) return setReportStatus('রিপোর্ট জমা দেওয়া যায়নি। আবার চেষ্টা করুন।')
    setReportOpen(false)
    setReportDetails('')
    setReportStatus('আপনার রিপোর্টটি জমা হয়েছে। ধন্যবাদ।')
  }

  const canMessage = Boolean(product && !product.is_owner && product.seller_type !== 'platform')
  const canBuy = Boolean(product && product.stock > 0 && !product.is_owner)

  return <div className="min-h-screen bg-slate-50 text-gray-900">
    <Navbar />
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <Link href="/educational-product" className="text-sm font-semibold text-primary hover:underline">← মার্কেটপ্লেসে ফিরুন</Link>
      {loading ? <div className="mt-6 grid gap-8 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2"><div className="h-80 animate-pulse rounded-xl bg-gray-200" /><div className="space-y-4"><div className="h-6 w-2/3 animate-pulse rounded bg-gray-200" /><div className="h-12 w-1/3 animate-pulse rounded bg-gray-200" /></div></div> : !product ? <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm"><p className="text-lg font-semibold text-slate-700">{error || 'পণ্যটি পাওয়া যায়নি অথবা আর উপলভ্য নেই'}</p></div> : <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
          {selectedImage ? <img src={selectedImage} alt={product.title} className="h-80 w-full rounded-xl bg-slate-100 object-contain" /> : <div className="flex h-80 items-center justify-center rounded-xl bg-gray-200 text-slate-500">পণ্যের ছবি</div>}
          {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto">{images.map((image, index) => <button key={image} type="button" onClick={() => setSelectedImage(image)} aria-label={`ছবি ${index + 1} দেখুন`} className={`shrink-0 rounded-lg border-2 ${selectedImage === image ? 'border-primary' : 'border-transparent'}`}><img src={image} alt={`${product.title} — ছবি ${index + 1}`} className="h-16 w-16 rounded-md object-cover" /></button>)}</div>}
          <div className="mt-6 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-primary">{product.category}</span>{product.level && <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{product.level}</span>}<span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{product.type === 'digital' ? 'ডিজিটাল' : 'ফিজিক্যাল'}</span>{product.condition && <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{product.condition === 'new' ? 'নতুন' : 'ব্যবহৃত'}</span>}</div>
          <h2 className="mt-6 text-xl font-bold text-primary">পণ্যের বিবরণ</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">{product.description}</p>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${product.seller_type === 'platform' ? 'bg-amber-50 text-amber-800' : product.seller_type === 'tutor' ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>{sellerBadge(product)}</span>
            <h1 className="mt-3 text-2xl font-bold text-primary">{product.title}</h1>
            <p className="mt-3 text-3xl font-bold text-primary">{formatPrice(Number(product.price))}</p>
            <p className={`mt-2 text-sm font-semibold ${product.stock > 0 ? 'text-green-700' : 'text-red-700'}`}>{product.stock > 0 ? `মজুত ${new Intl.NumberFormat('bn-BD').format(product.stock)}টি` : 'স্টক শেষ'}</p>
            <div className="mt-6 space-y-3">
              {canBuy ? <Link href={`/educational-product/${product.id}/checkout`} className="block w-full rounded-xl bg-accent px-5 py-3 text-center font-bold text-white hover:bg-amber-600">কিনুন</Link> : <button type="button" disabled title={product.is_owner ? 'নিজের পণ্য নিজে কেনা যাবে না' : 'স্টক শেষ'} className="w-full rounded-xl bg-accent px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{product.is_owner ? 'নিজের পণ্য' : 'স্টক শেষ'}</button>}
              {canMessage && <a href="#seller-message" className="block rounded-xl border border-primary px-5 py-3 text-center font-bold text-primary hover:bg-blue-50">Seller-কে মেসেজ করুন</a>}
            </div>
          </section>
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-primary">বিক্রেতার তথ্য</h2>
            <div className="mt-4 flex items-center gap-3">
              {product.seller_photo_url ? <img src={product.seller_photo_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 font-bold text-primary">{product.seller_type === 'platform' ? 'L' : product.seller_type === 'tutor' ? 'T' : 'S'}</div>}
              <div><p className="font-semibold text-slate-900">{product.seller_label}</p>{product.seller_rating && <p className="text-sm text-amber-700">★ {Number(product.seller_rating).toFixed(1)} · {new Intl.NumberFormat('bn-BD').format(product.seller_review_count ?? 0)}টি রিভিউ</p>}{product.seller_type === 'student' && <p className="text-xs text-slate-500">ব্যক্তিগত যোগাযোগের তথ্য গোপন রাখা হয়</p>}</div>
            </div>
          </section>
          {canMessage && <section id="seller-message" className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-primary">বিক্রেতাকে মেসেজ</h2>
            {!user ? <Link href="/login" className="mt-3 inline-flex font-semibold text-primary hover:underline">মেসেজ করতে লগইন করুন</Link> : <><div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">{messages.length === 0 ? <p className="text-sm text-slate-500">এখনো কোনো বার্তা নেই</p> : messages.map((item) => <p key={item.id} className={`max-w-[90%] rounded-xl p-3 text-sm ${item.sender_id === user.id ? 'ml-auto bg-blue-100 text-blue-950' : 'bg-white text-slate-800'}`}><span className="mb-1 block text-xs font-semibold">{item.sender_id === user.id ? 'আপনি' : 'বিক্রেতা'}</span>{item.body}</p>)}</div><form onSubmit={(event) => void sendMessage(event)} className="mt-3 space-y-3"><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={3} placeholder="আপনার বার্তা লিখুন" className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" /><button type="submit" disabled={sending || !message.trim()} className="rounded-xl bg-accent px-4 py-2.5 font-bold text-white hover:bg-amber-600 disabled:opacity-50">{sending ? 'পাঠানো হচ্ছে…' : 'বার্তা পাঠান'}</button></form>{messageStatus && <p role="status" className="mt-3 text-sm text-slate-600">{messageStatus}</p>}</>}
          </section>}
          {!product.is_owner && <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-primary">এই তালিকা রিপোর্ট করুন</h2>
            {!user ? <Link href="/login" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">রিপোর্ট করতে লগইন করুন</Link> : reportOpen ? <form onSubmit={(event) => void submitReport(event)} className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                রিপোর্টের কারণ
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 p-2.5">
                  <option value="copyright">কপিরাইট / পাইরেটেড</option>
                  <option value="fake">নকল পণ্য</option>
                  <option value="wrong_info">ভুল তথ্য</option>
                  <option value="spam">স্প্যাম</option>
                  <option value="other">অন্যান্য</option>
                </select>
              </label>
              <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3} placeholder="বিস্তারিত লিখুন (ঐচ্ছিক)" className="w-full rounded-lg border border-gray-300 p-3" />
              <div className="flex gap-2">
                <button type="submit" disabled={reporting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{reporting ? 'জমা হচ্ছে...' : 'রিপোর্ট জমা দিন'}</button>
                <button type="button" onClick={() => setReportOpen(false)} className="rounded-lg border px-4 py-2 text-sm">বাতিল</button>
              </div>
            </form> : <button type="button" onClick={() => setReportOpen(true)} className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">রিপোর্ট করুন</button>}
            {reportStatus && <p role="status" className="mt-3 text-sm text-gray-600">{reportStatus}</p>}
          </section>}
        </aside>
      </div>}
    </main>
    <Footer />
  </div>
}
