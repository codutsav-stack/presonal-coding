export const MAX_FILE_BYTES = 3 * 1024 * 1024
export const MAX_ATTACHMENTS = 20
export const acceptedFiles = '.pdf,.txt,.md,.png,.jpg,.jpeg,.webp'
export const fileTypes: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export function validateFile(file: { name: string; size: number; type: string }) {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const contentType = Object.hasOwn(fileTypes, extension) ? fileTypes[extension] : undefined
  if (!contentType) throw new Error('Choose a PDF, Markdown, text, PNG, JPEG, or WebP file.')
  if (file.size < 1) throw new Error('Empty files cannot be attached.')
  if (file.size > MAX_FILE_BYTES) throw new Error('Attachments must be 3 MB or smaller.')
  if (file.type && file.type !== contentType && !(extension === 'md' && file.type === 'text/plain')) {
    throw new Error('The file type does not match its extension.')
  }
  return contentType
}

export function fileSizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
