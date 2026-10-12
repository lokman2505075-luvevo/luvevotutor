'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Message = {
  id: string
  product_id: string
  sender_id: string
  recipient_id: string
  body: string
  created_at: string
}

type Conversation = {
  key: string
  productId: string
  partnerId: string
  productTitle: string
  messages: Message[]
}

export default function MarketplaceSellerMessages({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadMessages = useCallback(async () => {
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('marketplace_messages')
      .select('id, product_id, sender_id, recipient_id, body, created_at')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true })
      .limit(200)

    if (queryError) {
      setError('বার্তাগুলো লোড করা যায়নি')
      setLoading(false)
      return
    }

    const messages = (data ?? []) as Message[]
    const productIds = [...new Set(messages.map((message) => message.product_id))]
    const productResult = productIds.length
      ? await supabase.from('products').select('id, title').in('id', productIds)
      : { data: [], error: null }

    if (productResult.error) {
      setError('পণ্যের তথ্য লোড করা যায়নি')
      setLoading(false)
      return
    }

    const titles = new Map((productResult.data ?? []).map((product) => [product.id, product.title]))
    const grouped = new Map<string, Conversation>()
    for (const message of messages) {
      const partnerId = message.sender_id === userId ? message.recipient_id : message.sender_id
      const key = `${message.product_id}:${partnerId}`
      const conversation: Conversation = grouped.get(key) ?? {
        key,
        productId: message.product_id,
        partnerId,
        productTitle: titles.get(message.product_id) ?? 'মুছে ফেলা পণ্য',
        messages: [],
      }
      conversation.messages.push(message)
      grouped.set(key, conversation)
    }
    setConversations([...grouped.values()].reverse())
    setError('')
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  async function sendReply(conversation: Conversation) {
    const body = (replies[conversation.key] ?? '').trim()
    if (!body || sending) return
    setSending(conversation.key)
    setError('')
    const { error: sendError } = await supabase.rpc('marketplace_send_message', {
      product_id: conversation.productId,
      message_body: body,
      recipient_id: conversation.partnerId,
    })
    setSending(null)
    if (sendError) {
      setError(`বার্তা পাঠানো যায়নি: ${sendError.message}`)
      return
    }
    setReplies((current) => ({ ...current, [conversation.key]: '' }))
    await loadMessages()
  }

  return <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
    <h2 className="text-xl font-bold text-primary">আমার বার্তা</h2>
    <p className="mt-1 text-sm text-slate-500">ক্রেতার সঙ্গে যোগাযোগ Luvevo-র মধ্যেই রাখুন; ব্যক্তিগত যোগাযোগের তথ্য শেয়ার করবেন না।</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="py-8 text-center text-slate-500">লোড হচ্ছে…</p> : conversations.length === 0 ? <p className="py-8 text-center text-slate-500">এখনো কোনো বার্তা নেই</p> : <div className="mt-4 space-y-4">
      {conversations.map((conversation) => <article key={conversation.key} className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900">{conversation.productTitle}</h3>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {conversation.messages.map((message) => <p key={message.id} className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${message.sender_id === userId ? 'ml-auto bg-blue-50 text-blue-950' : 'bg-slate-100 text-slate-800'}`}>
            <span className="mb-1 block text-xs font-semibold text-slate-500">{message.sender_id === userId ? 'আপনি' : 'ক্রেতা'}</span>
            {message.body}
          </p>)}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <textarea aria-label="বার্তার উত্তর" rows={2} maxLength={2000} value={replies[conversation.key] ?? ''} onChange={(event) => setReplies((current) => ({ ...current, [conversation.key]: event.target.value }))} className="min-h-11 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="উত্তর লিখুন" />
          <button type="button" disabled={sending !== null || !(replies[conversation.key] ?? '').trim()} onClick={() => void sendReply(conversation)} className="self-end rounded-xl bg-accent px-4 py-2 font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60">{sending === conversation.key ? 'পাঠানো হচ্ছে…' : 'উত্তর পাঠান'}</button>
        </div>
      </article>)}
    </div>}
  </section>
}
