import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Prism from 'prismjs'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { safeHref } from '../lib/utils'

export function CodeBlock({ code, language = 'cpp' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const highlighted = useMemo(() => Prism.highlight(code, Prism.languages[language] || Prism.languages.plain || {}, language), [code, language])
  return <div className="code-viewer"><div className="code-viewer-header"><span>{language === 'cpp' ? 'C++' : language}</span><button onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); toast.success('Code copied'); setTimeout(() => setCopied(false), 2000) } catch { toast.error('Clipboard access is unavailable') } }} className="text-button">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy code'}</button></div><pre><code className={`language-${language}`} dangerouslySetInnerHTML={{ __html: highlighted }} /></pre></div>
}
export function Markdown({ content }: { content: string }) {
  return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    a: ({ href, children }) => safeHref(href) ? <a href={safeHref(href)} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => { const text = String(children); const language = /language-(\w+)/.exec(className || '')?.[1]; return language || text.includes('\n') ? <CodeBlock code={text.replace(/\n$/, '')} language={language || 'plain'} /> : <code>{children}</code> },
  }}>{content}</ReactMarkdown></div>
}
