'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import { LEVELS } from '../../lib/levels'
import { SUBJECTS } from '../../lib/subjects'

type MarketplaceProduct = {
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
  images: string[]
}

const CATEGORIES = [...SUBJECTS, 'HSC', 'SSC', 'Admission', 'বই', 'স্টেশনারি', 'অন্যান্য']
const inputClass = 'min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100'

function formatPrice(value: number) {
  return `৳${new Intl.NumberFormat('bn-BD').format(value)}`
}

function latinDigits(value: string) {
  return value.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit))).replace(/[٬,]/g, '')
}

function sellerBadge(product: MarketplaceProduct) {
  if (product.seller_type === 'platform') return 'Luvevo Official'
  if (product.seller_type === 'tutor') return 'Tutor ✔'
  return 'Student'
}

export default function EducationalProductPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<MarketplaceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [type, setType] = useState('')
  const [sellerType, setSellerType] = useState('')
  const [condition, setCondition] = useState('')
  const [sort, setSort] = useState<'newest' | 'price-low' | 'price-high' | 'popular'>('newest')

  useEffect(() => {
    let active = true
    async function loadProducts() {
      setLoading(true)
      setError('')
      const { data, error: productError } = await supabase
        .from('public_marketplace_products')
        .select('id, seller_type, seller_label, title, description, category, level, type, price, condition, stock, delivery_available, created_at, seller_photo_url, seller_rating, seller_review_count, popularity_count, is_owner')
        .order('created_at', { ascending: false })
      if (productError) {
        if (active) setError('মার্কেটপ্লেসের পণ্যগুলো লোড করা যায়নি')
        if (active) setLoading(false)
        return
      }

      const listings = (data ?? []) as Omit<MarketplaceProduct, 'images'>[]
      const { data: imageRows, error: imageError } = listings.length
        ? await supabase.from('product_images').select('product_id, storage_path').in('product_id', listings.map((item) => item.id)).order('created_at')
        : { data: [], error: null }
      if (imageError) {
        if (active) setError('পণ্যগুলোর ছবি লোড করা যায়নি')
        if (active) setLoading(false)
        return
      }

      const imagesByProduct = new Map<string, string[]>()
      for (const row of imageRows ?? []) {
        const { data: publicUrl } = supabase.storage.from('marketplace-images').getPublicUrl(row.storage_path)
        imagesByProduct.set(row.product_id, [...(imagesByProduct.get(row.product_id) ?? []), publicUrl.publicUrl])
      }
      if (active) {
        setProducts(listings.map((item) => ({ ...item, images: imagesByProduct.get(item.id) ?? [] })))
        setLoading(false)
      }
    }

    void loadProducts()
    return () => { active = false }
  }, [])

  const filteredProducts = useMemo(() => {
    const minimum = minPrice ? Number(latinDigits(minPrice)) : null
    const maximum = maxPrice ? Number(latinDigits(maxPrice)) : null
    return products.filter((product) => {
      const searchable = `${product.title} ${product.description} ${product.category} ${product.level ?? ''} ${product.seller_label}`.toLocaleLowerCase()
      return (!query.trim() || searchable.includes(query.trim().toLocaleLowerCase()))
        && (!category || product.category === category)
        && (!level || product.level === level)
        && (minimum === null || product.price >= minimum)
        && (maximum === null || product.price <= maximum)
        && (!type || product.type === type)
        && (!sellerType || product.seller_type === sellerType)
        && (!condition || product.condition === condition)
    }).sort((first, second) => {
      if (sort === 'price-low') return Number(first.price) - Number(second.price)
      if (sort === 'price-high') return Number(second.price) - Number(first.price)
      if (sort === 'popular') return Number(second.popularity_count) - Number(first.popularity_count)
      return new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
    })
  }, [category, condition, level, maxPrice, minPrice, products, query, sellerType, sort, type])

  function clearFilters() {
    setQuery('')
    setCategory('')
    setLevel('')
    setMinPrice('')
    setMaxPrice('')
    setType('')
    setSellerType('')
    setCondition('')
    setSort('newest')
  }

  return <div className="min-h-screen bg-white text-gray-900">
    <Navbar />
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-amber-600">Luvevo Marketplace</p><h1 className="mt-1 text-2xl font-bold text-primary">শিক্ষা উপকরণ</h1><p className="mt-2 text-slate-600">Luvevo, যাচাইকৃত টিউটর ও শিক্ষার্থীদের শিক্ষাসামগ্রী এক জায়গায়।</p></div>
        <Link href={user ? '/educational-product/sell' : '/login'} className="inline-flex rounded-xl bg-accent px-5 py-3 font-bold text-white transition hover:bg-amber-600">পণ্য বিক্রি করুন</Link>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">পণ্য খুঁজুন</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="পণ্য, বিষয় বা বিক্রেতা খুঁজুন" className={`${inputClass} min-h-12 pl-4`} /></label>
        <label className="sm:w-52"><span className="sr-only">পণ্য সাজান</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className={inputClass}><option value="newest">সর্বশেষ</option><option value="price-low">দাম: কম থেকে বেশি</option><option value="price-high">দাম: বেশি থেকে কম</option><option value="popular">জনপ্রিয়</option></select></label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <details open className="h-fit rounded-2xl border border-blue-100 bg-slate-50 p-4">
          <summary className="cursor-pointer font-bold text-primary">ফিল্টার</summary>
          <div className="mt-4 space-y-4">
            <FilterSelect label="বিভাগ" value={category} onChange={setCategory} options={CATEGORIES} placeholder="সব বিভাগ" />
            <FilterSelect label="ক্লাস / লেভেল" value={level} onChange={setLevel} options={LEVELS} placeholder="সব লেভেল" />
            <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700">দামের সীমা</legend><div className="flex gap-2"><input inputMode="numeric" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="সর্বনিম্ন" className={inputClass} /><input inputMode="numeric" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="সর্বোচ্চ" className={inputClass} /></div></fieldset>
            <FilterSelect label="ধরন" value={type} onChange={setType} options={['physical', 'digital']} labels={['ফিজিক্যাল', 'ডিজিটাল']} placeholder="সব ধরন" />
            <FilterSelect label="বিক্রেতা" value={sellerType} onChange={setSellerType} options={['platform', 'tutor', 'student']} labels={['Luvevo', 'Tutor', 'Student']} placeholder="সব বিক্রেতা" />
            <FilterSelect label="অবস্থা" value={condition} onChange={setCondition} options={['new', 'used']} labels={['নতুন', 'ব্যবহৃত']} placeholder="নতুন ও ব্যবহৃত" />
            <button type="button" onClick={clearFilters} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">ফিল্টার মুছুন</button>
          </div>
        </details>

        <section aria-label="মার্কেটপ্লেসের পণ্য">
          <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xl font-bold text-primary">সব পণ্য</h2>{!loading && <span className="text-sm text-slate-500">{new Intl.NumberFormat('bn-BD').format(filteredProducts.length)}টি পণ্য</span>}</div>
          {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {loading ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm"><div className="mb-4 h-40 rounded bg-gray-200" /><div className="h-4 w-2/3 rounded bg-gray-200" /><div className="mt-3 h-4 w-1/3 rounded bg-gray-200" /></div>)}</div> : filteredProducts.length === 0 ? <div className="rounded-2xl border border-dashed border-blue-200 bg-slate-50 px-6 py-12 text-center"><p className="text-lg font-semibold text-slate-700">এখনো কোনো পণ্য নেই</p><Link href={user ? '/educational-product/sell' : '/login'} className="mt-4 inline-flex rounded-xl bg-accent px-5 py-3 font-bold text-white hover:bg-amber-600">প্রথম পণ্যটি বিক্রি করুন</Link></div> : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredProducts.map((product) => <article key={product.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <Link href={`/educational-product/${product.id}`} className="block">
              {product.images[0] ? <img src={product.images[0]} alt={product.title} className="mb-4 h-40 w-full rounded-xl object-cover" /> : <div className="mb-4 h-40 rounded-xl bg-gray-200" aria-label="পণ্যের ছবি" />}
              <span className={`mb-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${product.seller_type === 'platform' ? 'bg-amber-50 text-amber-800' : product.seller_type === 'tutor' ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>{sellerBadge(product)}</span>
              <h3 className="font-semibold text-slate-900">{product.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{product.category}{product.level ? ` · ${product.level}` : ''} · {product.type === 'digital' ? 'ডিজিটাল' : product.condition === 'used' ? 'ব্যবহৃত' : 'নতুন'}</p>
              <p className="mt-2 font-bold text-primary">{formatPrice(Number(product.price))}</p>
            </Link>
            <div className="mt-auto flex items-center justify-between gap-3 pt-4">
              <span className="text-xs text-slate-500">{product.stock <= 0 ? 'স্টক শেষ' : `মজুত ${new Intl.NumberFormat('bn-BD').format(product.stock)}`}{product.seller_rating ? ` · ★ ${Number(product.seller_rating).toFixed(1)}` : ''}</span>
              <Link href={`/educational-product/${product.id}`} className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white hover:bg-amber-600">{product.stock > 0 ? 'বিস্তারিত / কিনুন' : 'বিস্তারিত'}</Link>
            </div>
          </article>)}</div>}
        </section>
      </div>
    </main>
    <Footer />
  </div>
}

function FilterSelect({ label, value, onChange, options, labels, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; labels?: string[]; placeholder: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1.5 font-normal`}><option value="">{placeholder}</option>{options.map((option, index) => <option key={option} value={option}>{labels?.[index] ?? option}</option>)}</select></label>
}
