'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type ListingStatus = 'pending' | 'approved' | 'rejected' | 'sold'
type MarketplaceListing = {
  id: string
  seller_type: 'platform' | 'tutor' | 'student'
  title: string
  description: string
  category: string
  level: string | null
  type: 'physical' | 'digital'
  price: number
  condition: 'new' | 'used' | null
  stock: number
  status: ListingStatus
  created_at: string
  images: string[]
  digitalPreviewUrl: string | null
}

const filters: { value: ListingStatus; label: string }[] = [
  { value: 'pending', label: 'অপেক্ষমাণ' },
  { value: 'approved', label: 'অনুমোদিত' },
  { value: 'rejected', label: 'বাতিল' },
]

function formatPrice(value: number) {
  return `৳${new Intl.NumberFormat('bn-BD').format(value)}`
}

export default function MarketplaceApprovalTable() {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [filter, setFilter] = useState<ListingStatus>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  async function loadListings() {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('products')
      .select('id, seller_type, title, description, category, level, type, price, condition, stock, status, created_at')
      .order('created_at', { ascending: false })
    if (queryError) {
      setError('পণ্যের তালিকা লোড করা যায়নি')
      setLoading(false)
      return
    }

    const products = data ?? []
    const productIds = products.map((product) => product.id)
    const [imageResult, fileResult] = productIds.length
      ? await Promise.all([
          supabase.from('product_images').select('product_id, storage_path').in('product_id', productIds).order('created_at'),
          supabase.from('product_files').select('product_id, storage_path').in('product_id', productIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]
    if (imageResult.error || fileResult.error) {
      setError('পণ্যের ছবি বা ফাইলের তথ্য লোড করা যায়নি')
      setLoading(false)
      return
    }

    const imagesByProduct = new Map<string, string[]>()
    for (const image of imageResult.data ?? []) {
      const { data: imageUrl } = supabase.storage.from('marketplace-images').getPublicUrl(image.storage_path)
      imagesByProduct.set(image.product_id, [...(imagesByProduct.get(image.product_id) ?? []), imageUrl.publicUrl])
    }
    const digitalUrlEntries = await Promise.all((fileResult.data ?? []).map(async (file) => {
      const { data: signedUrl, error: signedUrlError } = await supabase.storage.from('marketplace-digital').createSignedUrl(file.storage_path, 3600)
      return [file.product_id, signedUrlError ? null : signedUrl.signedUrl] as const
    }))
    setListings(products.map((product) => ({
      ...product,
      images: imagesByProduct.get(product.id) ?? [],
      digitalPreviewUrl: digitalUrlEntries.find(([id]) => id === product.id)?.[1] ?? null,
    })) as MarketplaceListing[])
    if (digitalUrlEntries.some(([, url]) => !url)) setError('কিছু PDF ফাইলের প্রিভিউ তৈরি করা যায়নি')
    setLoading(false)
  }

  useEffect(() => { void loadListings() }, [])

  async function changeStatus(listing: MarketplaceListing, status: 'approved' | 'rejected') {
    const action = status === 'approved' ? 'অনুমোদন' : 'বাতিল'
    if (!window.confirm(`“${listing.title}” ${action} করবেন?`)) return
    const reason = status === 'rejected' ? window.prompt('বাতিলের কারণ লিখুন (ঐচ্ছিক)') : null
    if (status === 'rejected' && reason === null) return
    if (reason && reason.trim().length > 500) return setError('বাতিলের কারণ ৫০০ অক্ষরের মধ্যে রাখুন')
    setSavingId(listing.id)
    setError('')
    const { error: updateError } = await supabase
      .from('products')
      .update({ status, rejection_reason: reason?.trim() || null })
      .eq('id', listing.id)
    if (updateError) setError('পণ্যের অবস্থা পরিবর্তন করা যায়নি')
    else setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status } : item))
    setSavingId(null)
  }

  const visibleListings = listings.filter((listing) => listing.status === filter)

  return <section className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap gap-2 border-b pb-4">
      {filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${filter === item.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}>{item.label}</button>)}
      <button type="button" onClick={() => void loadListings()} className="ml-auto rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">রিফ্রেশ</button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="py-12 text-center text-gray-500">লোড হচ্ছে…</p> : visibleListings.length === 0 ? <p className="py-12 text-center text-gray-500">এই তালিকায় কোনো পণ্য নেই</p> : <div className="mt-5 space-y-4">{visibleListings.map((listing) => <article key={listing.id} className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-bold text-slate-900">{listing.title}</h2><p className="mt-1 text-sm text-slate-600">{listing.category}{listing.level ? ` · ${listing.level}` : ''} · {listing.type === 'physical' ? 'ফিজিক্যাল' : 'ডিজিটাল'}{listing.condition ? ` · ${listing.condition === 'new' ? 'নতুন' : 'ব্যবহৃত'}` : ''}</p></div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">{listing.seller_type === 'tutor' ? 'টিউটর' : listing.seller_type === 'student' ? 'শিক্ষার্থী' : 'Luvevo'}</span>
      </div>
      {!!listing.images.length && <div className="mt-4 flex flex-wrap gap-2">{listing.images.map((image, index) => <a key={image} href={image} target="_blank" rel="noreferrer" className="block"><img src={image} alt={`${listing.title} — ছবি ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" /></a>)}</div>}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{listing.description}</p>
      <p className="mt-3 text-sm font-bold text-primary">{formatPrice(listing.price)} <span className="font-normal text-slate-500">· মজুত: {new Intl.NumberFormat('bn-BD').format(listing.stock)} · {new Date(listing.created_at).toLocaleDateString('bn-BD')}</span></p>
      {listing.digitalPreviewUrl && <a href={listing.digitalPreviewUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">সংযুক্ত PDF যাচাই করুন ↗</a>}
      {listing.status === 'pending' && <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={savingId === listing.id} onClick={() => void changeStatus(listing, 'approved')} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">অনুমোদন করুন</button>
        <button type="button" disabled={savingId === listing.id} onClick={() => void changeStatus(listing, 'rejected')} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">বাতিল করুন</button>
      </div>}
    </article>)}</div>}
  </section>
}
