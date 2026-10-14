import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({ open, onClose, title, description, children, className = '' }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; className?: string }) {
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose() }}><Dialog.Portal>
    <Dialog.Overlay className="modal-overlay" />
    <Dialog.Content className={`modal-content ${className}`} asChild>
      <motion.section initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .18 }}>
        <div className="modal-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description || 'Make room for your next idea.'}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Close dialog"><X size={19} /></Dialog.Close></div>
        {children}
      </motion.section>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}
