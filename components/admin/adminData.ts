import { supabase } from '@/lib/supabaseClient'
import type { RequestConfig } from './requestConfig'

export type RequestRow = Record<string, unknown> & { id?: string | number }

export async function fetchRequestRows(config: RequestConfig) {
  if (!config.table) return { data: [] as RequestRow[], error: null }

  const { data, error } = await supabase.from(config.table).select('*')
  return { data: (data ?? []) as RequestRow[], error }
}

export async function updateRequest(rowId: string | number, values: Record<string, unknown>, config: RequestConfig) {
  if (!config.table) return { error: new Error('এই সেবার কোনো request table নেই') }

  return supabase
    .from(config.table)
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', rowId)
}

export function getFirstValue(row: RequestRow, fields: string[]) {
  for (const field of fields) {
    const value = row[field]
    if (value !== null && value !== undefined && String(value).trim()) return String(value)
  }
  return ''
}

export function getRowDate(row: RequestRow, config: RequestConfig) {
  const value = getFirstValue(row, config.dateFields)
  const timestamp = value ? new Date(value).getTime() : 0
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export function formatDate(value: unknown) {
  if (!value) return 'তারিখ নেই'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })
}

export function toCsv(rows: RequestRow[]) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [keys.map(escape).join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\n')
}
