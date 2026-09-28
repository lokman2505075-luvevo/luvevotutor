"use client"

import { useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function EducationalProductPage() {
  const products = [
    { id: 1, name: 'হাতিয়ার কিট - গণিত', price: '৫০০৳' },
    { id: 2, name: 'লার্নিং বোর্ড', price: '১,২০০৳' },
    { id: 3, name: 'বইলেট প্যাক', price: '৩০০৳' },
    { id: 4, name: 'স্মার্ট নোটবুক', price: '৭৫০৳' },
    { id: 5, name: 'প্র্যাকটিস সেট', price: '৪৫০৳' },
    { id: 6, name: 'টিউশন অ্যাসেসর', price: '১,০০০৳' }
  ]

  const [boughtId, setBoughtId] = useState<number | null>(null)

  function handleBuy(id: number) {
    setBoughtId(id)
    setTimeout(() => setBoughtId(null), 4000)
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-primary mb-6">শিক্ষা উপকরণ</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-4 shadow flex flex-col">
              <div className="h-40 bg-gray-200 rounded mb-4" />
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-primary font-bold mt-2">{p.price}</p>
              <div className="mt-4">
                <button onClick={() => handleBuy(p.id)} className="bg-accent text-white px-3 py-2 rounded">কিনুন</button>
                {boughtId === p.id && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded">আপনার অর্ডার গ্রহণ করা হয়েছে — শীঘ্রই যোগাযোগ করা হবে</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
