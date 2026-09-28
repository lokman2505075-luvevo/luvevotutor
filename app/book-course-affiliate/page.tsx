"use client"

import { useState } from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

export default function BookCoursePage() {
  const [category, setCategory] = useState('সব')

  const items = [
    { id: 1, type: 'book', title: 'প্রগতি গণিত', author: 'এম.এস. রহমান', price: '৪০০৳' },
    { id: 2, type: 'course', title: 'ফাউন্ডেশন কোর্স: গণিত', author: 'Math Academy', price: '২,০০০৳' },
    { id: 3, type: 'book', title: 'অগ্রগতি বিজ্ঞান', author: 'ড. জামিলা', price: '৩৫০৳' },
    { id: 4, type: 'course', title: 'ইংরেজি স্পোকেন কোর্স', author: 'SpeakUp', price: '১,৫০০৳' },
    { id: 5, type: 'book', title: 'উন্মেষ ইতিহাস', author: 'আর.কে.', price: '৩০০৳' },
    { id: 6, type: 'course', title: 'প্রোগ্রামিং বেসিক', author: 'CodeLab', price: '৩,৫০০৳' },
    { id: 7, type: 'book', title: 'রচনাশৈলী উন্নয়ন', author: 'শফিকুল ইসলাম', price: '২২০৳' },
    { id: 8, type: 'course', title: 'এডভান্সড ডেটা সায়েন্স', author: 'DataPro', price: '৫,০০০৳' }
  ]

  const filtered = category === 'সব' ? items : items.filter((i) => (category === 'বই' ? i.type === 'book' : i.type === 'course'))

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">বই ও কোর্স</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm">বাছাই:</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="p-2 border rounded">
              <option value="সব">সব</option>
              <option value="বই">বই</option>
              <option value="কোর্স">কোর্স</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map((it) => (
            <div key={it.id} className="bg-white rounded-xl p-4 shadow flex flex-col">
              <div className="h-40 bg-gray-200 rounded mb-4" />
              <h3 className="font-semibold">{it.title}</h3>
              <p className="text-sm text-gray-600">{it.author}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-primary font-bold">{it.price}</div>
                <button className="bg-accent text-white px-3 py-2 rounded">বিস্তারিত দেখুন</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
