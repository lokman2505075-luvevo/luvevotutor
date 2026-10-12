"use client"
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import TeacherCourseForm from '../../../components/courses/TeacherCourseForm'

export default function NewCoursePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">নতুন কোর্স যোগ করুন</h1>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <TeacherCourseForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}