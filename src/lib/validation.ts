import { z } from 'zod'
import { kinds, categories, statuses } from '../types'

export const safeUrl = z.string().trim().max(2048).refine(value => {
  if (!value) return true
  try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false }
}, 'Enter a valid http:// or https:// URL')

export const entrySchema = z.object({
  kind: z.enum(kinds),
  title: z.string().trim().min(2, 'Use at least 2 characters').max(160),
  description: z.string().max(50000).default(''),
  category: z.string().max(100),
  status: z.string().max(40),
  pinned: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  data: z.record(z.string().max(50), z.union([z.string().max(100000), z.number().finite(), z.boolean()])).default({}),
  projectId: z.uuid().nullable().default(null),
  parentId: z.uuid().nullable().default(null),
}).superRefine((value, context) => {
  if (!categories[value.kind].includes(value.category)) context.addIssue({ code: 'custom', path: ['category'], message: 'Choose a valid category' })
  if (!statuses[value.kind].includes(value.status)) context.addIssue({ code: 'custom', path: ['status'], message: 'Choose a valid status' })
  for (const field of ['url', 'github', 'live', 'documentation', 'cover']) {
    if (value.data[field] && !safeUrl.safeParse(value.data[field]).success) context.addIssue({ code: 'custom', path: ['data', field], message: 'Enter a valid http:// or https:// URL' })
  }
  if (value.kind === 'resource' && !value.data.url) context.addIssue({ code: 'custom', path: ['data', 'url'], message: 'A resource URL is required' })
  if (value.kind === 'question') {
    if (!['Easy', 'Medium', 'Hard'].includes(String(value.data.difficulty))) context.addIssue({ code: 'custom', path: ['data', 'difficulty'], message: 'Choose a difficulty' })
    if (!['Custom', 'LeetCode', 'College Assignment', 'Codeforces', 'HackerRank', 'Other'].includes(String(value.data.source))) context.addIssue({ code: 'custom', path: ['data', 'source'], message: 'Choose a source' })
  }
  if (value.kind === 'task' && !['Low', 'Medium', 'High'].includes(String(value.data.priority))) context.addIssue({ code: 'custom', path: ['data', 'priority'], message: 'Choose a priority' })
  for (const field of ['dueDate', 'startDate', 'nextReview']) {
    const date = value.data[field]
    if (date && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) context.addIssue({ code: 'custom', path: ['data', field], message: 'Enter a valid date' })
  }
  for (const [field, maximum] of [['attempts', 10000], ['confidence', 5]] as const) {
    const number = value.data[field]
    if (number !== undefined && (typeof number !== 'number' || !Number.isInteger(number) || number < 0 || number > maximum)) context.addIssue({ code: 'custom', path: ['data', field], message: `Use a whole number between 0 and ${maximum}` })
  }
})
export type EntryInput = z.input<typeof entrySchema>
export type EntryValues = z.output<typeof entrySchema>
export const preferencesSchema = z.object({ theme: z.enum(['dark', 'light', 'system']), reducedMotion: z.boolean(), defaultView: z.enum(['grid', 'list']), weeklyGoal: z.number().int().min(1).max(100) })
export const importSchema = z.object({ version: z.literal(1), entries: z.array(entrySchema).max(1000) })
