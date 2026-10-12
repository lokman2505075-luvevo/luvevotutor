import CourseApprovalTable from '../../../components/admin/CourseApprovalTable'

export default function AdminCoursesPage() {
  return (
    <div>
      <p className="mb-1 text-sm text-gray-500"><a href="/admin" className="hover:underline">ড্যাশবোর্ড</a></p>
      <h1 className="mb-1 text-2xl font-bold">কোর্স অনুমোদন</h1>
      <p className="mb-6 text-sm text-gray-600">শিক্ষকদের জমা দেওয়া কোর্স যাচাই করে অনুমোদন বা বাতিল করুন।</p>
      <CourseApprovalTable />
    </div>
  )
}