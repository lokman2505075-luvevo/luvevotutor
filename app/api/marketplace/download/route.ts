import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })

  let body: { orderId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'অনুরোধটি সঠিক নয়' }, { status: 400 })
  }
  if (typeof body.orderId !== 'string' || !UUID_PATTERN.test(body.orderId)) {
    return NextResponse.json({ error: 'সঠিক অর্ডার নম্বর দিন' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    console.error('[Marketplace] download endpoint environment is incomplete')
    return NextResponse.json({ error: 'ডাউনলোড সেবা সাময়িকভাবে অনুপলভ্য' }, { status: 500 })
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: authError } = await adminClient.auth.getUser(accessToken)
  if (authError || !user) return NextResponse.json({ error: 'লগইন করুন' }, { status: 401 })

  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('id, product_id, buyer_id, payment_status, order_status')
    .eq('id', body.orderId)
    .eq('buyer_id', user.id)
    .maybeSingle()
  if (orderError) {
    console.error('[Marketplace] download order lookup failed:', orderError.message)
    return NextResponse.json({ error: 'অর্ডার যাচাই করা যায়নি' }, { status: 500 })
  }
  if (!order || order.payment_status !== 'paid' || order.order_status !== 'completed') {
    return NextResponse.json({ error: 'পেমেন্ট সম্পন্ন না হওয়া পর্যন্ত ডাউনলোড করা যাবে না' }, { status: 403 })
  }

  const [{ data: product, error: productError }, { data: file, error: fileError }] = await Promise.all([
    adminClient.from('products').select('id, type, title').eq('id', order.product_id).maybeSingle(),
    adminClient.from('product_files').select('storage_path').eq('product_id', order.product_id).maybeSingle(),
  ])
  if (productError || fileError) {
    console.error('[Marketplace] download file lookup failed:', productError?.message ?? fileError?.message)
    return NextResponse.json({ error: 'ডাউনলোড ফাইল যাচাই করা যায়নি' }, { status: 500 })
  }
  if (!product || product.type !== 'digital' || !file) {
    return NextResponse.json({ error: 'ডিজিটাল ফাইলটি পাওয়া যায়নি' }, { status: 404 })
  }

  const { data: signedFile, error: signedUrlError } = await adminClient.storage
    .from('marketplace-digital')
    .createSignedUrl(file.storage_path, 300, { download: `${product.title}.pdf` })
  if (signedUrlError) {
    console.error('[Marketplace] signed download URL creation failed:', signedUrlError.message)
    return NextResponse.json({ error: 'ডাউনলোড লিংক তৈরি করা যায়নি' }, { status: 500 })
  }

  const { data: remainingDownloads, error: authorizationError } = await userClient
    .rpc('marketplace_authorize_download', { target_order_id: order.id })
  if (authorizationError) {
    const limitReached = authorizationError.message.toLowerCase().includes('limit')
    return NextResponse.json(
      { error: limitReached ? 'ডাউনলোডের সর্বোচ্চ ৫ বার ব্যবহার হয়ে গেছে' : 'এই অর্ডারের ডাউনলোড অনুমোদিত নয়' },
      { status: limitReached ? 429 : 403 },
    )
  }

  return NextResponse.json({
    downloadUrl: signedFile.signedUrl,
    remainingDownloads,
    expiresInSeconds: 300,
  })
}
