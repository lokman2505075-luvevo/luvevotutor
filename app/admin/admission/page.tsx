import AdmissionManagement from '../../../components/admin/AdmissionManagement'

export default function AdminAdmissionPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-primary"><a href="/admin" className="hover:underline">ড্যাশবোর্ড</a></p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">ভর্তি তথ্য</h1>
        <p className="mt-1 text-gray-600">ভার্সিটি ও কলেজের ভর্তি তথ্য যোগ, সম্পাদনা এবং প্রকাশনা নিয়ন্ত্রণ করুন।</p>
      </div>
      <AdmissionManagement />
    </div>
  )
}