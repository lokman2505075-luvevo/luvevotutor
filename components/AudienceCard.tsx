import Link from 'next/link'

export default function AudienceCard({ title, body, links }: { title: string; body: string; links: { label: string; href: string }[] }) {
  return <div className="mx-auto max-w-2xl rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-bold text-blue-950">{title}</h1><p className="mt-3 leading-7 text-slate-600">{body}</p><div className="mt-6 flex flex-wrap justify-center gap-3">{links.map((link) => <Link key={link.href} href={link.href} className="rounded-xl bg-primary px-5 py-3 font-bold text-white">{link.label}</Link>)}</div></div>
}