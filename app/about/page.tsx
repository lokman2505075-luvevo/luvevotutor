"use client"

import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import StatsBar from '../../components/StatsBar'

export default function AboutPage() {

  const services = [
    {
      name: 'Tuition Media',
      border: 'border-blue-500',
      icon: (<><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></>)
    },
    {
      name: 'Printing',
      border: 'border-orange-500',
      icon: (<><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" /><rect x="6" y="14" width="12" height="8" rx="1" /></>)
    },
    {
      name: 'Admission Service and Consultancy',
      border: 'border-emerald-500',
      icon: (<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="m9 15 2 2 4-4" /></>)
    },
    {
      name: 'Educational Product',
      border: 'border-cyan-500',
      icon: (<><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="m7.5 4.27 9 5.15" /></>)
    },
    {
      name: 'Assignment Help and Sohayatri',
      border: 'border-rose-500',
      icon: (<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>)
    },
    {
      name: 'Online Courses and Tuition',
      border: 'border-indigo-500',
      icon: (<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />)
    }
  ]

  const team = [
    { name: 'Lavlu', role: 'Founder & CEO', photo: '/team/member2.jpg' },
    { name: 'Farju', role: 'Co-Founder & COO', photo: '/team/member3.png' },
    { name: 'Lokman', university: 'Bangladesh Agricultural University', role: 'CTO', photo: '/team/member1.jpg' },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* আমাদের সম্পর্কে starts here */}
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
          {/* <div className="h-56 bg-gray-200 rounded-lg" /> */}
          <div className="rounded-lg overflow-hidden bg-gray-100">
            <img
              src="/about/journey.png"
              alt="Luvevo Tutor-er shikkha uddyog"
              className="w-full h-auto"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group bg-white rounded-xl p-6 shadow cursor-pointer transition duration-300 hover:-translate-y-1 hover:shadow-lg active:-translate-y-1 active:shadow-lg">
            <h3 className="font-semibold mb-2 transition-colors duration-300 group-hover:text-primary group-active:text-primary">Mission</h3>
            <p className="text-gray-700">উচ্চমানের শিক্ষা সেবা সহজলভ্য করে প্রতিটি ছাত্র-ছাত্রীকে শেখার সুযোগ প্রদান করা।</p>
          </div>
          <div className="group bg-white rounded-xl p-6 shadow cursor-pointer transition duration-300 hover:-translate-y-1 hover:shadow-lg active:-translate-y-1 active:shadow-lg">
            <h3 className="font-semibold mb-2 transition-colors duration-300 group-hover:text-primary group-active:text-primary">Vision</h3>
            <p className="text-gray-700">সম্পূর্ণ একটি বিশ্বস্ত, বহুমুখী এবং দক্ষ শিক্ষা ইকোসিস্টেম তৈরি করা যা শিক্ষাকে প্রায়োগিক ও অন্তর্ভুক্তিমূলক করে তুলবে।</p>
          </div>
        </section>
        {/* আমাদের সম্পর্কে ends here */}

        {/* আমাদের সার্ভিসসমূহ starts here */}
        <section>
          <h3 className="text-xl font-semibold mb-4">আমাদের সার্ভিসসমূহ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((s) => (
              <div
                key={s.name}
                className={`group bg-white rounded-xl p-5 shadow border-t-4 ${s.border} transition duration-300 hover:-translate-y-1 hover:shadow-lg active:-translate-y-1 active:shadow-lg`}
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center mb-4 transition duration-300 group-hover:scale-110 group-active:scale-110">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {s.icon}
                  </svg>
                </div>
                <div className="font-semibold transition-colors duration-300 group-hover:text-primary group-active:text-primary">
                  {s.name}
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* আমাদের সার্ভিসসমূহ ends here */}

            {/* আমাদের মূল্যবোধ Starts Here*/}
      <section>
        <h3 className="text-xl font-semibold mb-4">আমাদের মূল্যবোধ</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji: '🔒', title: 'বিশ্বাসযোগ্যতা' },
            { emoji: '✅', title: 'মান নিয়ন্ত্রণ' },
            { emoji: '🎯', title: 'শিক্ষার্থী-কেন্দ্রিক সেবা' },
            { emoji: '🌐', title: 'সহজলভ্যতা' }
          ].map((v) => (
            <div
              key={v.title}
              className="group bg-white rounded-xl p-4 shadow text-center transition duration-300 hover:-translate-y-1 hover:shadow-lg active:-translate-y-1 active:shadow-lg"
            >
              <div className="text-2xl mb-2 transition duration-300 group-hover:scale-125 group-active:scale-125">
                {v.emoji}
              </div>
              <div className="font-semibold transition-colors duration-300 group-hover:text-primary group-active:text-primary">
                {v.title}
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* আমাদের মূল্যবোধ ends here */}

        {/* Team Section Starts Here*/}
          <section>
            <h3 className="text-xl font-semibold mb-4">আমাদের টিম</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {team.map((m) => (
                <div
                  key={m.name}
                  className="group bg-white rounded-xl p-4 shadow text-center transition duration-300 hover:-translate-y-1 hover:shadow-lg active:-translate-y-1 active:shadow-lg"
                >
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="h-24 w-24 rounded-full object-cover object-top mx-auto mb-3 transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold mx-auto mb-3 transition duration-300 group-hover:scale-105">
                      {m.name.charAt(0)}
                    </div>
                  )}
                  <div className="font-semibold transition-colors duration-300 group-hover:text-primary">
                    {m.name}
                  </div>
                  <div className="text-sm text-gray-600">{m.role}</div>
                  {m.university && (
                    <div className="text-xs text-gray-500 mt-1">{m.university}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        {/* Team Section Ends Here */}

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
