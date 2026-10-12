'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
import { LEVELS } from '../../lib/levels'
import { SUBJECTS } from '../../lib/subjects'
import { supabase } from '../../lib/supabaseClient'
import MarketplaceSellerMessages from './MarketplaceSellerMessages'

const CATEGORIES = [...SUBJECTS, 'HSC', 'SSC', 'Admission', 'বই', 'স্টেশনারি', 'অন্যান্য']
const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 outline-none focus:border-primary focus:ring-4 focus:ring-blue-100'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_DIGITAL_SIZE = 15 * 1024 * 1024

function latinDigits(value: string) {
  return value.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit))).replace(/[٬,]/g, '')
}

function formatPrice(value: number) {
  return `৳${new Intl.NumberFormat('bn-BD').format(value)}`
}

type SellerProduct = {
  id: string
  title: string
  description: string
  category: string
  level: string | null
  type: 'physical' | 'digital'
  price: number
  condition: 'new' | 'used' | null
  stock: number
  pickup_location: string | null
  delivery_available: boolean
  status: 'pending' | 'approved' | 'rejected' | 'sold'
  rejection_reason: string | null
  created_at: string
}

type SellerOrder = {
  id: string
  product_id: string
  product_title: string
  product_type: 'physical' | 'digital'
  quantity: number
  amount: number
  commission_amount: number
  seller_earning: number
  payment_method: 'bkash' | 'nagad' | 'cod'
  payment_status: 'pending' | 'verification_pending' | 'paid' | 'failed' | 'refunded'
  order_status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled'
  fulfillment_method: 'pickup' | 'delivery' | null
  pickup_location: string | null
  created_at: string
  buyer_label: string
  buyer_phone: string | null
  delivery_address: string | null
}

type SellerPayout = {
  id: string
  amount: number
  status: 'pending' | 'paid' | 'rejected'
  payout_method: string | null
  created_at: string
  paid_at: string | null
}

const ORDER_STATUS_LABELS: Record<SellerOrder['order_status'], string> = {
  pending: 'অপেক্ষমাণ',
  confirmed: 'নিশ্চিত',
  shipped: 'পাঠানো হয়েছে',
  delivered: 'ডেলিভারি হয়েছে',
  completed: 'সম্পন্ন',
  cancelled: 'বাতিল',
}

const PAYMENT_METHOD_LABELS: Record<SellerOrder['payment_method'], string> = {
  bkash: 'বিকাশ',
  nagad: 'নগদ',
  cod: 'ক্যাশ অন ডেলিভারি',
}

const statusLabels: Record<SellerProduct['status'], string> = {
  pending: 'অনুমোদনের অপেক্ষায়',
  approved: 'অনুমোদিত',
  rejected: 'অনুমোদিত হয়নি',
  sold: 'বিক্রি হয়েছে',
}

export default function SellerListingForm({ showForm = true }: { showForm?: boolean }) {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [type, setType] = useState<'physical' | 'digital'>('physical')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<'new' | 'used'>('new')
  const [stock, setStock] = useState('1')
  const [pickupLocation, setPickupLocation] = useState('')
  const [deliveryAvailable, setDeliveryAvailable] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [digitalFile, setDigitalFile] = useState<File | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [rows, setRows] = useState<SellerProduct[]>([])
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [payouts, setPayouts] = useState<SellerPayout[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setPhone(user?.phone ?? profile?.phone ?? '')
    setPhoneVerified(Boolean(user?.phone_confirmed_at))
  }, [profile?.phone, user?.id, user?.phone, user?.phone_confirmed_at])

  useEffect(() => {
    if (!user) {
      setRows([])
      setLoadingRows(false)
      return
    }

    const sellerId = user.id
    const isPlatformAdmin = profile?.role === 'admin'
    let active = true
    async function loadSellerProducts() {
      setLoadingRows(true)
      let productQuery = supabase
        .from('products')
        .select('id, title, description, category, level, type, price, condition, stock, pickup_location, delivery_available, status, rejection_reason, created_at')
        .order('created_at', { ascending: false })
      productQuery = isPlatformAdmin ? productQuery.eq('seller_type', 'platform') : productQuery.eq('seller_id', sellerId)
      const [productResult, orderResult, payoutResult] = await Promise.all([
        productQuery,
        isPlatformAdmin
          ? Promise.resolve({ data: [], error: null })
          : supabase.from('marketplace_seller_orders').select('id, product_id, product_title, product_type, quantity, amount, commission_amount, seller_earning, payment_method, payment_status, order_status, fulfillment_method, pickup_location, created_at, buyer_label, buyer_phone, delivery_address').order('created_at', { ascending: false }),
        isPlatformAdmin
          ? Promise.resolve({ data: [], error: null })
          : supabase.from('seller_payouts').select('id, amount, status, payout_method, created_at, paid_at').eq('seller_id', sellerId).order('created_at', { ascending: false }),
      ])
      if (!active) return
      if (productResult.error || orderResult.error || payoutResult.error) {
        setError('আপনার পণ্য, অর্ডার বা পেআউটের তথ্য লোড করা যায়নি')
      } else {
        setRows((productResult.data ?? []) as SellerProduct[])
        setOrders((orderResult.data ?? []) as SellerOrder[])
        setPayouts((payoutResult.data ?? []) as SellerPayout[])
      }
      setLoadingRows(false)
    }

    void loadSellerProducts()
    return () => { active = false }
  }, [profile?.role, user?.id])

  async function sendPhoneOtp() {
    setError('')
    setMessage('')
    if (!phone.trim()) return setError('ফোন নম্বর লিখুন')
    setSendingOtp(true)
    const { error: otpError } = await supabase.auth.updateUser({ phone: phone.trim() })
    setSendingOtp(false)
    if (otpError) return setError(`ভেরিফিকেশন কোড পাঠানো যায়নি: ${otpError.message}`)
    setOtpSent(true)
    setMessage('আপনার ফোনে পাঠানো ভেরিফিকেশন কোডটি লিখুন')
  }

  async function verifyPhoneOtp() {
    setError('')
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: otp.trim(),
      type: 'phone_change',
    })
    if (verifyError) return setError(`ফোন নম্বর যাচাই করা যায়নি: ${verifyError.message}`)
    setPhoneVerified(Boolean(data.user?.phone_confirmed_at))
    setOtpSent(false)
    setMessage('আপনার ফোন নম্বর যাচাই হয়েছে')
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    setError('')
    const selected = Array.from(event.target.files ?? [])
    if (selected.length > 5) {
      setImages([])
      event.target.value = ''
      return setError('সর্বোচ্চ ৫টি ছবি যোগ করা যাবে')
    }
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setImages([])
      event.target.value = ''
      return setError('শুধু JPG, PNG অথবা WebP ছবি যোগ করুন')
    }
    if (selected.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setImages([])
      event.target.value = ''
      return setError('প্রতিটি ছবির আকার ৫ মেগাবাইটের মধ্যে রাখুন')
    }
    setImages(selected)
  }

  function clearForm() {
    setEditingProductId(null)
    setTitle('')
    setDescription('')
    setCategory('')
    setLevel('')
    setType('physical')
    setPrice('')
    setCondition('new')
    setStock('1')
    setPickupLocation('')
    setDeliveryAvailable(false)
    setImages([])
    setDigitalFile(null)
  }

  function editListing(product: SellerProduct) {
    setError('')
    setMessage('')
    setEditingProductId(product.id)
    setTitle(product.title)
    setDescription(product.description)
    setCategory(product.category)
    setLevel(product.level ?? '')
    setType(product.type)
    setPrice(String(product.price))
    setCondition(product.condition ?? 'new')
    setStock(String(product.stock))
    setPickupLocation(product.pickup_location ?? '')
    setDeliveryAvailable(product.delivery_available)
    setImages([])
    setDigitalFile(null)
    if (showForm) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function markAsSold(product: SellerProduct) {
    if (!window.confirm(`“${product.title}” বিক্রি হয়ে গেছে হিসেবে চিহ্নিত করবেন?`)) return
    setError('')
    const { error: updateError } = await supabase
      .from('products')
      .update({ status: 'sold', stock: 0 })
      .eq('id', product.id)
      .eq('status', 'approved')
    if (updateError) return setError('পণ্যটি বিক্রি হয়েছে হিসেবে চিহ্নিত করা যায়নি')
    setRows((current) => current.map((row) => row.id === product.id ? { ...row, status: 'sold', stock: 0 } : row))
  }

  async function updateDeliveryStatus(order: SellerOrder, nextStatus: 'shipped' | 'delivered') {
    setError('')
    const { error: updateError } = await supabase.rpc('marketplace_seller_update_delivery', {
      order_id: order.id,
      next_status: nextStatus,
    })
    if (updateError) return setError('অর্ডারের অবস্থা পরিবর্তন করা যায়নি')
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, order_status: nextStatus } : item))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!user || !profile) return setError('পণ্য জমা দিতে লগইন করুন')
    if (profile.role !== 'student' && profile.role !== 'tutor' && profile.role !== 'admin') return setError('শুধু শিক্ষার্থী ও টিউটর পণ্য বিক্রি করতে পারবেন')
    if (profile.role === 'tutor' && profile.status !== 'approved') return setError('পণ্য বিক্রি করতে আপনার টিউটর প্রোফাইল অনুমোদিত হতে হবে')
    if (profile.role === 'student' && !phoneVerified) return setError('পণ্য বিক্রির আগে ফোন নম্বর যাচাই করুন')
    if (!title.trim() || !description.trim() || !category || !price.trim()) return setError('শিরোনাম, বিবরণ, বিভাগ ও দাম পূরণ করুন')
    if (description.length > 4000) return setError('বিবরণ ৪,০০০ অক্ষরের মধ্যে রাখুন')

    const numericPrice = Number(latinDigits(price).trim())
    const numericStock = Number(latinDigits(stock).trim())
    if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 10000000) return setError('সঠিক দাম লিখুন')
    if (!Number.isInteger(numericStock) || numericStock < 1 || numericStock > 10000) return setError('স্টকের পরিমাণ ১ থেকে ১০,০০০-এর মধ্যে লিখুন')
    if (type === 'digital' && !editingProductId && (!digitalFile || digitalFile.type !== 'application/pdf' || digitalFile.size > MAX_DIGITAL_SIZE)) return setError('১৫ মেগাবাইটের মধ্যে একটি PDF ফাইল যোগ করুন')
    if (type === 'digital' && digitalFile && (digitalFile.type !== 'application/pdf' || digitalFile.size > MAX_DIGITAL_SIZE)) return setError('১৫ মেগাবাইটের মধ্যে একটি PDF ফাইল যোগ করুন')
    if (type === 'physical' && !pickupLocation.trim() && !deliveryAvailable) return setError('পিকআপের স্থান অথবা ডেলিভারি অপশন দিন')

    setSubmitting(true)
    const productId = crypto.randomUUID()
    const sellerType = profile.role === 'admin' ? 'platform' : profile.role
    const uploadedImages: string[] = []
    let uploadedDigitalPath: string | null = null

    try {
      if (editingProductId) {
        const { error: updateError } = await supabase.from('products').update({
          title: title.trim(),
          description: description.trim(),
          category,
          level: level || null,
          price: numericPrice,
          condition: type === 'physical' ? condition : null,
          stock: numericStock,
          pickup_location: type === 'physical' ? pickupLocation.trim() || null : null,
          delivery_available: type === 'physical' && deliveryAvailable,
          status: 'pending',
          rejection_reason: null,
        }).eq('id', editingProductId)
        if (updateError) throw updateError

        setRows((current) => current.map((product) => product.id === editingProductId ? {
          ...product,
          title: title.trim(),
          description: description.trim(),
          category,
          level: level || null,
          price: numericPrice,
          condition: type === 'physical' ? condition : null,
          stock: numericStock,
          pickup_location: type === 'physical' ? pickupLocation.trim() || null : null,
          delivery_available: type === 'physical' && deliveryAvailable,
          status: 'pending',
          rejection_reason: null,
        } : product))
        clearForm()
        setMessage('আপনার পরিবর্তন জমা হয়েছে। পুনরায় অনুমোদনের পর পণ্যটি প্রকাশিত হবে।')
        router.refresh()
        return
      }

      const { error: insertError } = await supabase.from('products').insert({
        id: productId,
        seller_id: profile.role === 'admin' ? null : user.id,
        seller_type: sellerType,
        title: title.trim(),
        description: description.trim(),
        category,
        level: level || null,
        type,
        price: numericPrice,
        condition: type === 'physical' ? condition : null,
        stock: numericStock,
        pickup_location: type === 'physical' ? pickupLocation.trim() || null : null,
        delivery_available: type === 'physical' && deliveryAvailable,
      })
      if (insertError) throw insertError

      const imageRows: { product_id: string; storage_path: string }[] = []
      for (const image of images) {
        const extension = image.type === 'image/jpeg' ? 'jpg' : image.type.split('/')[1]
        const path = `${user.id}/${productId}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage.from('marketplace-images').upload(path, image, { contentType: image.type, upsert: false })
        if (uploadError) throw uploadError
        uploadedImages.push(path)
        imageRows.push({ product_id: productId, storage_path: path })
      }

      if (imageRows.length) {
        const { error: imageError } = await supabase.from('product_images').insert(imageRows)
        if (imageError) throw imageError
      }

      if (type === 'digital' && digitalFile) {
        const path = `${user.id}/${productId}/${crypto.randomUUID()}.pdf`
        const { error: uploadError } = await supabase.storage.from('marketplace-digital').upload(path, digitalFile, { contentType: 'application/pdf', upsert: false })
        if (uploadError) throw uploadError
        uploadedDigitalPath = path
        const { error: fileError } = await supabase.from('product_files').insert({ product_id: productId, storage_path: path })
        if (fileError) throw fileError
      }

      setRows((current) => [{
        id: productId,
        title: title.trim(),
        description: description.trim(),
        category,
        level: level || null,
        type,
        price: numericPrice,
        condition: type === 'physical' ? condition : null,
        stock: numericStock,
        pickup_location: type === 'physical' ? pickupLocation.trim() || null : null,
        delivery_available: type === 'physical' && deliveryAvailable,
        status: 'pending',
        rejection_reason: null,
        created_at: new Date().toISOString(),
      }, ...current])
      clearForm()
      setMessage('আপনার পণ্য জমা হয়েছে। অনুমোদনের পর মার্কেটপ্লেসে দেখা যাবে।')
      router.refresh()
    } catch (submissionError) {
      const cleanupResults = await Promise.all([
        ...uploadedImages.map((path) => supabase.storage.from('marketplace-images').remove([path])),
        ...(uploadedDigitalPath ? [supabase.storage.from('marketplace-digital').remove([uploadedDigitalPath])] : []),
        supabase.from('products').delete().eq('id', productId),
      ])
      const cleanupError = cleanupResults.find((result) => result.error)?.error
      if (cleanupError) console.error('[Marketplace] listing cleanup failed:', cleanupError.message)
      const detail = submissionError instanceof Error ? submissionError.message : 'অজানা সমস্যা'
      setError(`পণ্য জমা দেওয়া যায়নি: ${detail}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteListing(product: SellerProduct) {
    if (!window.confirm(`“${product.title}” পণ্যটি মুছে ফেলবেন? এই কাজটি আর ফিরিয়ে নেওয়া যাবে না।`)) return
    setError('')
    const [{ data: imageRows, error: imageQueryError }, { data: fileRow, error: fileQueryError }] = await Promise.all([
      supabase.from('product_images').select('storage_path').eq('product_id', product.id),
      supabase.from('product_files').select('storage_path').eq('product_id', product.id).maybeSingle(),
    ])
    if (imageQueryError || fileQueryError) return setError('পণ্যের সংযুক্ত ফাইলের তথ্য লোড করা যায়নি')
    const storageErrors = await Promise.all([
      ...(imageRows?.length ? [supabase.storage.from('marketplace-images').remove(imageRows.map((row) => row.storage_path))] : []),
      ...(fileRow ? [supabase.storage.from('marketplace-digital').remove([fileRow.storage_path])] : []),
    ])
    const storageError = storageErrors.find((result) => result.error)?.error
    if (storageError) return setError(`পণ্যের সংযুক্ত ফাইল মুছে ফেলা যায়নি: ${storageError.message}`)
    const { error: deleteError } = await supabase.from('products').delete().eq('id', product.id)
    if (deleteError) return setError('পণ্যটি মুছে ফেলা যায়নি')
    setRows((current) => current.filter((row) => row.id !== product.id))
  }

  if (loading) return <div className="min-h-screen bg-gray-50" />
  if (!user || !profile) return <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold text-primary">পণ্য বিক্রি করতে লগইন করুন</h1><Link href="/login" className="mt-5 inline-flex rounded-xl bg-accent px-5 py-3 font-bold text-white">লগইন করুন</Link></div>

  const isPlatformAdmin = profile.role === 'admin'
  const canSell = profile.role === 'student' || profile.role === 'tutor' || isPlatformAdmin
  const tutorApproved = profile.role !== 'tutor' || profile.status === 'approved'

  const totalEarnings = orders.filter((order) => order.payment_status === 'paid').reduce((sum, order) => sum + Number(order.seller_earning), 0)
  const totalCommission = orders.filter((order) => order.payment_status === 'paid').reduce((sum, order) => sum + Number(order.commission_amount), 0)
  const totalPaidOut = payouts.filter((payout) => payout.status === 'paid').reduce((sum, payout) => sum + Number(payout.amount), 0)
  const payableBalance = Math.max(0, totalEarnings - totalPaidOut)

  return <div className="mx-auto max-w-5xl space-y-7">
    {!showForm && <h2 className="text-2xl font-bold text-primary">আমার পণ্য</h2>}
    {!showForm && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <SummaryCard label="মোট পণ্য" value={rows.length} />
      <SummaryCard label="লাইভ" value={rows.filter((row) => row.status === 'approved').length} tone="green" />
      <SummaryCard label="Pending" value={rows.filter((row) => row.status === 'pending').length} tone="amber" />
      <SummaryCard label="বিক্রি হয়েছে" value={rows.filter((row) => row.status === 'sold').length} tone="slate" />
      <SummaryCard label="মোট আয়" value={formatPrice(totalEarnings)} tone="blue" />
    </div>}
    {showForm && <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
      <div className="mb-6"><Link href={isPlatformAdmin ? '/admin/products' : '/educational-product'} className="text-sm font-semibold text-primary hover:underline">{isPlatformAdmin ? '← অ্যাডমিন প্যানেলে ফিরুন' : '← মার্কেটপ্লেসে ফিরুন'}</Link><h1 className="mt-3 text-2xl font-bold text-primary sm:text-3xl">{isPlatformAdmin ? 'Luvevo Official পণ্য যোগ করুন' : 'পণ্য বিক্রি করুন'}</h1><p className="mt-2 text-slate-600">আপনার শিক্ষাসামগ্রী জমা দিন। যাচাইয়ের পর মার্কেটপ্লেসে প্রকাশ করা হবে।</p></div>
      {!canSell && <p className="rounded-xl bg-amber-50 p-4 text-amber-800">শুধু শিক্ষার্থী ও টিউটর অ্যাকাউন্ট থেকে পণ্য তালিকাভুক্ত করা যাবে।</p>}
      {profile.role === 'tutor' && !tutorApproved && <p className="rounded-xl bg-amber-50 p-4 text-amber-800">পণ্য তালিকাভুক্ত করতে আপনার টিউটর প্রোফাইল অনুমোদিত হতে হবে।</p>}
      {showForm && profile.role === 'student' && !phoneVerified && <div id="phone-verification" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-bold text-amber-950">ফোন নম্বর যাচাই করুন</h2><p className="mt-1 text-sm text-amber-900">নিরাপদে বিক্রি করতে আপনার অ্যাকাউন্টে ফোন নম্বর যুক্ত করে OTP যাচাই করতে হবে।</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" placeholder="+8801XXXXXXXXX" className={inputClass} /><button type="button" disabled={sendingOtp} onClick={() => void sendPhoneOtp()} className="shrink-0 rounded-xl bg-primary px-4 py-2 font-bold text-white disabled:opacity-60">{sendingOtp ? 'পাঠানো হচ্ছে…' : 'OTP পাঠান'}</button></div>
        {otpSent && <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="ভেরিফিকেশন কোড" className={inputClass} /><button type="button" onClick={() => void verifyPhoneOtp()} className="shrink-0 rounded-xl bg-accent px-4 py-2 font-bold text-white">ফোন যাচাই করুন</button></div>}
      </div>}
      {phoneVerified && profile.role === 'student' && <p className="mb-5 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">আপনার ফোন নম্বর যাচাই করা হয়েছে</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {showForm && canSell && tutorApproved && (profile.role !== 'student' || phoneVerified) && <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        {editingProductId && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><p>পণ্য সম্পাদনার পর পুনরায় অনুমোদনের জন্য জমা হবে। পণ্যের ধরন ও আপলোড করা মিডিয়া এই ধাপে পরিবর্তন করা যাবে না।</p><button type="button" onClick={clearForm} className="font-semibold underline">সম্পাদনা বাতিল</button></div>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="পণ্যের নাম" value={title} onChange={setTitle} required maxLength={120} />
          <SelectField label="বিভাগ" value={category} onChange={setCategory} options={CATEGORIES} placeholder="বিভাগ নির্বাচন করুন" />
          <SelectField label="ক্লাস / লেভেল" value={level} onChange={setLevel} options={LEVELS} placeholder="প্রযোজ্য হলে নির্বাচন করুন" optional />
          <SelectField label="পণ্যের ধরন" value={type} onChange={(value) => setType(value as 'physical' | 'digital')} options={['physical', 'digital']} labels={['ফিজিক্যাল', 'ডিজিটাল']} disabled={Boolean(editingProductId)} />
          <Field label="দাম (৳)" value={price} onChange={setPrice} inputMode="decimal" required placeholder="যেমন: ৫০০" />
          <Field label="স্টকের পরিমাণ" value={stock} onChange={setStock} inputMode="numeric" required />
          {type === 'physical' && <SelectField label="অবস্থা" value={condition} onChange={(value) => setCondition(value as 'new' | 'used')} options={['new', 'used']} labels={['নতুন', 'ব্যবহৃত']} />}
        </div>
        <div><label className="mb-2 block text-sm font-semibold text-slate-700">পণ্যের বিবরণ</label><textarea required value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={5} className={inputClass} /></div>
        {type === 'physical' ? <div className="grid gap-5 sm:grid-cols-2">
          <Field label="পিকআপের স্থান" value={pickupLocation} onChange={setPickupLocation} placeholder="জেলা / এলাকা" />
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={deliveryAvailable} onChange={(event) => setDeliveryAvailable(event.target.checked)} className="h-4 w-4 accent-primary" />ডেলিভারি দেওয়া যাবে</label>
        </div> : !editingProductId && <FileField label="PDF ফাইল (সর্বোচ্চ ১৫ মেগাবাইট)" accept="application/pdf,.pdf" onChange={(event) => setDigitalFile(event.target.files?.[0] ?? null)} />}
        {!editingProductId && <FileField label="পণ্যের ছবি (সর্বোচ্চ ৫টি, প্রতিটি ৫ মেগাবাইট)" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelection} />}
        {!editingProductId && <p className="text-xs leading-5 text-slate-500">PDF ফাইল ব্যক্তিগত স্টোরেজে সুরক্ষিত থাকবে। অনুমোদনের আগে পণ্য প্রকাশিত হবে না।</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-accent px-5 py-3 font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'জমা হচ্ছে…' : editingProductId ? 'পরিবর্তন জমা দিন' : 'অনুমোদনের জন্য জমা দিন'}</button>
      </form>}
    </section>}
    {!showForm && error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-primary">আপনার পণ্যের তালিকা</h2>
      {loadingRows ? <p className="py-8 text-center text-slate-500">লোড হচ্ছে…</p> : rows.length === 0 ? <div className="py-8 text-center"><p className="text-slate-600">এখনো কোনো পণ্য নেই</p>{profile.role === 'student' && !phoneVerified ? <Link href="/educational-product/sell#phone-verification" className="mt-4 inline-flex rounded-xl bg-accent px-5 py-3 font-bold text-white hover:bg-amber-600">আগে ফোন ভেরিফাই করুন</Link> : <Link href="/educational-product/sell" className="mt-4 inline-flex rounded-xl bg-accent px-5 py-3 font-bold text-white hover:bg-amber-600">প্রথম পণ্যটি বিক্রি করুন</Link>}</div> : <ul className="mt-4 divide-y divide-slate-100">{rows.map((product) => <li key={product.id} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{product.title}</p><p className="mt-1 text-sm text-slate-500">{product.category}{product.level ? ` · ${product.level}` : ''} · {product.type === 'physical' ? 'ফিজিক্যাল' : 'ডিজিটাল'} · {formatPrice(product.price)} · মজুত {new Intl.NumberFormat('bn-BD').format(product.stock)}</p>{product.rejection_reason && <p className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">বাতিলের কারণ: {product.rejection_reason}</p>}</div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status === 'approved' ? 'bg-green-100 text-green-800' : product.status === 'rejected' ? 'bg-red-100 text-red-800' : product.status === 'sold' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900'}`}>{statusLabels[product.status]}</span></div><div className="mt-3 flex flex-wrap gap-2">{product.status !== 'sold' && <button type="button" onClick={() => editListing(product)} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-blue-50">সম্পাদনা</button>}{product.status === 'approved' && <button type="button" onClick={() => void markAsSold(product)} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">বিক্রি হয়ে গেছে</button>}<button type="button" disabled={orders.some((order) => order.product_id === product.id)} onClick={() => void deleteListing(product)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{orders.some((order) => order.product_id === product.id) ? 'অর্ডার থাকায় মুছতে পারবেন না' : 'মুছুন'}</button></div></li>)}</ul>}
    </section>
    {!isPlatformAdmin && <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-primary">আমার বিক্রয় অর্ডার</h2>
      <p className="mt-1 text-sm text-slate-500">শিক্ষার্থী ক্রেতার ব্যক্তিগত যোগাযোগের তথ্য গোপন রাখা হয়।</p>
      {loadingRows ? <p className="py-8 text-center text-slate-500">লোড হচ্ছে…</p> : orders.length === 0 ? <p className="py-8 text-center text-slate-500">এখনো কোনো বিক্রয় অর্ডার নেই</p> : <div className="mt-4 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{order.product_title}</h3><p className="mt-1 text-sm text-slate-600">{order.buyer_label} · {new Intl.NumberFormat('bn-BD').format(order.quantity)}টি · {formatPrice(Number(order.amount))}</p><p className="mt-1 text-sm text-slate-500">{PAYMENT_METHOD_LABELS[order.payment_method]} · {order.payment_status === 'paid' ? 'পেমেন্ট সম্পন্ন' : order.payment_status === 'verification_pending' ? 'পেমেন্ট যাচাই চলছে' : order.payment_status === 'pending' ? 'পেমেন্ট অপেক্ষমাণ' : order.payment_status}</p><p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString('bn-BD')}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">{ORDER_STATUS_LABELS[order.order_status]}</span></div>{order.buyer_phone && <p className="mt-3 text-sm text-slate-700">ক্রেতার ফোন: {order.buyer_phone}</p>}{order.delivery_address && <p className="mt-1 text-sm text-slate-700">ডেলিভারি ঠিকানা: {order.delivery_address}</p>}{order.fulfillment_method === 'pickup' && order.pickup_location && <p className="mt-1 text-sm text-slate-700">পিকআপের স্থান: {order.pickup_location}</p>}{order.product_type === 'physical' && order.order_status === 'confirmed' && <button type="button" onClick={() => void updateDeliveryStatus(order, 'shipped')} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">পাঠানো হয়েছে হিসেবে চিহ্নিত করুন</button>}{order.product_type === 'physical' && order.order_status === 'shipped' && <button type="button" onClick={() => void updateDeliveryStatus(order, 'delivered')} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">ডেলিভারি সম্পন্ন করুন</button>}</article>)}</div>}
    </section>}
    {!showForm && !isPlatformAdmin && <MarketplaceSellerMessages userId={user.id} />}
    {!isPlatformAdmin && <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-primary">আয় ও পেআউট</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3"><SummaryCard label="মোট আয় (কমিশন বাদে)" value={formatPrice(totalEarnings)} tone="green" /><SummaryCard label="পরিশোধিত কমিশন" value={formatPrice(totalCommission)} tone="amber" /><SummaryCard label="পেআউটযোগ্য ব্যালেন্স" value={formatPrice(payableBalance)} tone="blue" /></div>
      <h3 className="mt-6 font-bold text-slate-800">পেআউটের ইতিহাস</h3>
      {loadingRows ? <p className="py-6 text-center text-slate-500">লোড হচ্ছে…</p> : payouts.length === 0 ? <p className="py-6 text-sm text-slate-500">এখনো কোনো পেআউট রেকর্ড নেই</p> : <ul className="mt-2 divide-y divide-slate-100">{payouts.map((payout) => <li key={payout.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{new Date(payout.created_at).toLocaleDateString('bn-BD')} · {payout.payout_method ?? 'পদ্ধতি উল্লেখ নেই'}</span><span className="font-semibold">{formatPrice(Number(payout.amount))} · {payout.status === 'paid' ? 'পরিশোধিত' : payout.status === 'pending' ? 'অপেক্ষমাণ' : 'বাতিল'}</span></li>)}</ul>}
    </section>}
  </div>
}

function Field({ label, value, onChange, required, maxLength, inputMode, placeholder }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; maxLength?: number; inputMode?: 'numeric' | 'decimal'; placeholder?: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} inputMode={inputMode} placeholder={placeholder} className={`${inputClass} mt-2 font-normal`} /></label>
}

function SelectField({ label, value, onChange, options, labels, placeholder, optional, disabled }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; labels?: string[]; placeholder?: string; optional?: boolean; disabled?: boolean }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<select required={!optional} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-2 font-normal disabled:bg-slate-100`}>{placeholder && <option value="">{placeholder}</option>}{options.map((option, index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}</select></label>
}

function FileField({ label, accept, multiple, onChange }: { label: string; accept: string; multiple?: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input type="file" accept={accept} multiple={multiple} onChange={onChange} className={`${inputClass} mt-2 h-auto file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-primary`} /></label>
}

function SummaryCard({ label, value, tone = 'slate' }: { label: string; value: string | number; tone?: 'slate' | 'green' | 'amber' | 'blue' }) {
  const colors = {
    slate: 'bg-slate-50 text-slate-900',
    green: 'bg-green-50 text-green-900',
    amber: 'bg-amber-50 text-amber-900',
    blue: 'bg-blue-50 text-blue-900',
  }
  return <div className={`rounded-xl p-4 ${colors[tone]}`}><p className="text-xs font-semibold opacity-80">{label}</p><p className="mt-2 text-xl font-bold">{typeof value === 'number' ? new Intl.NumberFormat('bn-BD').format(value) : value}</p></div>
}
