import PaymentVerifyTable from '../../../components/admin/PaymentVerifyTable'

export default function AdminCoursePaymentsPage() {
  return (
    <div>
      <p className="mb-1 text-sm text-gray-500"><a href="/admin" className="hover:underline">ড্যাশবোর্ড</a></p>
      <h1 className="mb-1 text-2xl font-bold">কোর্স পেমেন্ট যাচাই</h1>
      <p className="mb-6 text-sm text-gray-600">শিক্ষার্থীদের পাঠানো trxID মিলিয়ে পেমেন্ট Paid/Reject করুন।</p>
      <PaymentVerifyTable />
    </div>
  )
}