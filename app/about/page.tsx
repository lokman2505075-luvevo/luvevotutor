"use client"

import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import StatsBar from '../../components/StatsBar'

export default function AboutPage() {
  const services = [
    'Tuition Media',
    'Printing',
    'Admission Service and Consultancy',
    'Book and Course Affiliate',
    'Educational Product',
    'Assignment and Project Work'
  ]

  const team = [
    { name: 'শেখ সামাদ', role: 'প্রতিষ্ঠাতা' },
    { name: 'রিতা খান', role: 'অপারেশন্স ম্যানেজার' },
    { name: 'হাবিবুর রহমান', role: 'প্রোডাক্ট ম্যানেজার' }
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="bg-gray-50 rounded-xl p-8 text-center shadow">
          <h1 className="text-3xl font-bold text-primary">আমাদের সম্পর্কে</h1>
          <p className="mt-3 text-gray-700">Luvevo Tutor - শিক্ষার্থী ও অভিভাবকদের সব শিক্ষা প্রয়োজনের এক বিশ্বস্ত ঠিকানা</p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-3">আমাদের যাত্রা</h2>
            <p className="text-gray-700 mb-3">Luvevo Tutor শুরু করা হয়েছে শিক্ষার্থীদের ও অভিভাবকদের শিক্ষা সংক্রান্ত সার্ভিসগুলো এক ছাদের নিচে এনেই তাদের সময় ও শ্রম বাঁচাতে। বহুবার দেখা যায় টিউটর, প্রিন্টিং, ভর্তি পরামর্শ ইত্যাদি আলাদা আলাদা প্ল্যাটফর্মে খুঁজে নিতে হয় — আমরা সেই ঝামেলা দূর করতে চাই।</p>
            <p className="text-gray-700">আমরা চেষ্টা করি নির্ভরযোগ্য টিউটর, দ্রুত প্রিন্টিং সার্ভিস, এবং ভর্তি পরামর্শসহ সব শিক্ষা-সামগ্রী এক জায়গায় পৌঁছে দিতে।</p>
          </div>
          <div className="h-56 bg-gray-200 rounded-lg" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-6 shadow">
            <h3 className="font-semibold mb-2">Mission</h3>
            <p className="text-gray-700">উচ্চমানের শিক্ষা সেবা সহজলভ্য করে প্রতিটি ছাত্র-ছাত্রীকে শেখার সুযোগ প্রদান করা।</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow">
            <h3 className="font-semibold mb-2">Vision</h3>
            <p className="text-gray-700">সম্পূর্ণ একটি বিশ্বস্ত, বহুমুখী এবং দক্ষ শিক্ষা ইকোসিস্টেম তৈরি করা যা শিক্ষাকে প্রায়োগিক ও অন্তর্ভুক্তিমূলক করে তুলবে।</p>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-4">আমাদের সার্ভিসসমূহ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((s) => (
              <div key={s} className="bg-white rounded-xl p-4 shadow flex items-start gap-3">
                <div className="h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center">◎</div>
                <div>
                  <div className="font-medium">{s}</div>
                  <div className="text-sm text-gray-600">কেন ও কিভাবে আমরা সাহায্য করি</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-4">আমাদের মূল্যবোধ</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow text-center">
              <div className="text-2xl mb-2">🔒</div>
              <div className="font-semibold">বিশ্বাসযোগ্যতা</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="font-semibold">মান নিয়ন্ত্রণ</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow text-center">
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-semibold">শিক্ষার্থী-কেন্দ্রিক সেবা</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow text-center">
              <div className="text-2xl mb-2">🌐</div>
              <div className="font-semibold">সহজলভ্যতা</div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-4">আমাদের টিম</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {team.map((m) => (
              <div key={m.name} className="bg-white rounded-xl p-4 shadow text-center">
                <div className="h-24 w-24 bg-gray-200 rounded-full mx-auto mb-3" />
                <div className="font-semibold">{m.name}</div>
                <div className="text-sm text-gray-600">{m.role}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <StatsBar />
        </section>

        <section className="bg-primary text-white rounded-xl p-6 text-center">
          <h3 className="text-2xl font-semibold">আমাদের সাথে যুক্ত হন</h3>
          <div className="mt-3">
            <Link href="/contact" className="inline-block bg-white text-primary px-4 py-2 rounded">যোগাযোগ করুন</Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
