import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-12">
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="text-2xl font-bold">Luvevo Tutor</div>
          <p className="mt-2 text-gray-300">আপনার সব শিক্ষা প্রয়োজনের এক ঠিকানা।</p>
        </div>

        <div>
          <h4 className="font-semibold">Quick Links</h4>
          <ul className="mt-2 text-gray-300 space-y-1">
            <li><Link href="/" className="hover:text-white hover:underline">Home</Link></li>
            <li><Link href="/about" className="hover:text-white hover:underline">About</Link></li>
            <li><Link href="/contact" className="hover:text-white hover:underline">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">Our Services</h4>
          <ul className="mt-2 text-gray-300 space-y-1">
            <li><Link href="/tuition" className="hover:text-white hover:underline">Tuition Media</Link></li>
            <li><Link href="/printing" className="hover:text-white hover:underline">Printing</Link></li>
            <li><Link href="/admission-consultancy" className="hover:text-white hover:underline">Admission Service and Consultancy</Link></li>
            <li><Link href="/book-course-affiliate" className="hover:text-white hover:underline">Book and Course Affiliate</Link></li>
            <li><Link href="/educational-product" className="hover:text-white hover:underline">Educational Product</Link></li>
            <li><Link href="/assignment-project" className="hover:text-white hover:underline">Assignment and Project Work</Link></li>
            <li><Link href="/online-courses" className="hover:text-white hover:underline">Online Course and Tuition</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">Contact Info</h4>
          <ul className="mt-2 text-gray-300 space-y-1">
            <li><a href="tel:+8801843383301" className="hover:text-white hover:underline">ফোন/হোয়াটসঅ্যাপ: 01843383301</a></li>
            <li><a href="mailto:luvevoofficial@gmail.com" className="hover:text-white hover:underline">ইমেইল: luvevoofficial@gmail.com</a></li>
            <li>ঠিকানা: Bangladesh Agricultural University, Mymensingh</li>
          </ul>
        </div>
      </div>
      <div className="bg-gray-900 text-gray-400 text-sm py-4 text-center">© 2026 Luvevo Tutor. All rights reserved.</div>
    </footer>
  )
}