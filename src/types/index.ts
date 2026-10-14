export const kinds = ['project', 'question', 'note', 'resource', 'task'] as const
export type Kind = typeof kinds[number]
export type Data = Record<string, string | number | boolean>
export interface Entry {
  id: string
  userId: string
  kind: Kind
  title: string
  description: string
  category: string
  status: string
  pinned: boolean
  tags: string[]
  data: Data
  projectId: string | null
  parentId: string | null
  createdAt: string
  updatedAt: string
  openedAt: string | null
}
export interface Activity { id: string; title: string; action: string; kind: Kind; entryId: string | null; createdAt: string }
export interface Attachment {
  id: string
  entryId: string
  name: string
  contentType: string
  size: number
  createdAt: string
}
export interface Preferences { theme: 'dark' | 'light' | 'system'; reducedMotion: boolean; defaultView: 'grid' | 'list'; weeklyGoal: number }
export interface Workspace { entries: Entry[]; activities: Activity[]; preferences: Preferences }
export const defaults: Preferences = { theme: 'dark', reducedMotion: false, defaultView: 'grid', weeklyGoal: 5 }
export const categories: Record<Kind, string[]> = {
  project: ['Web Development', 'Generative AI', 'Python', 'Machine Learning', 'Data Science', 'Automation & n8n', 'C++ / DSA', 'Other Projects'],
  question: ['Arrays', 'Strings', 'Two Pointers', 'Sorting', 'Searching', 'Recursion', 'Linked Lists', 'Stacks and Queues', 'Hashing', 'Binary Search', 'Trees', 'Graphs', 'Dynamic Programming', 'Other Topics'],
  note: ['Web Development', 'Generative AI', 'Python & ML', 'College & Semester', 'Mathematics', 'Interview Preparation', 'Prompts', 'Project Documentation'],
  resource: ['Documentation', 'Websites', 'GitHub Repositories', 'Courses', 'Tutorials', 'YouTube', 'AI Tools', 'API References', 'Articles'],
  task: ['Learning Goal', 'Project Task', 'Practice', 'Reading', 'Other'],
}
export const statuses: Record<Kind, string[]> = {
  project: ['Idea', 'Planning', 'In Progress', 'Completed', 'Archived'],
  question: ['Not Started', 'Attempted', 'Solved', 'Review'],
  note: ['Draft', 'Published'], resource: ['Saved', 'Reading', 'Completed'], task: ['To Do', 'In Progress', 'Completed'],
}
export const labels: Record<Kind, string> = { project: 'Project', question: 'Question', note: 'Note', resource: 'Resource', task: 'Task' }
export const paths: Record<Kind, string> = { project: '/projects', question: '/questions', note: '/notes', resource: '/resources', task: '/tasks' }
