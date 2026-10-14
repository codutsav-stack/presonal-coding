import type { Entry } from '../types'
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function isReviewDue(entry: Entry) {
  return entry.kind === 'question' && (entry.status === 'Review' || (typeof entry.data.nextReview === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.data.nextReview) && entry.data.nextReview <= localDateKey()))
}
export function dateLabel(value: string) { return new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }
export function relativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : dateLabel(value)
}
export function searchEntries(entries: Entry[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  return entries.filter(entry => terms.every(term => `${entry.title} ${entry.description} ${entry.category} ${entry.tags.join(' ')} ${Object.values(entry.data).join(' ')}`.toLowerCase().includes(term)))
    .sort((first, second) => Number(second.title.toLowerCase().includes(query.toLowerCase())) - Number(first.title.toLowerCase().includes(query.toLowerCase())))
}
export function safeHref(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try { return ['https:', 'http:'].includes(new URL(value).protocol) ? value : undefined } catch { return undefined }
}
