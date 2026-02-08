'use client'

import { useState, useCallback, useEffect, memo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'

interface ShortcutEntry {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  title: string
  shortcuts: ShortcutEntry[]
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['⌘/Ctrl', 'K'], description: 'Open quick search' },
      { keys: ['?'], description: 'Show keyboard shortcuts' }
    ]
  },
  {
    title: 'Quiz Navigation',
    shortcuts: [
      { keys: ['←'], description: 'Previous question' },
      { keys: ['→'], description: 'Next question' },
      { keys: ['1-4'], description: 'Select answer option' },
      { keys: ['Enter'], description: 'Submit answer / Next question' }
    ]
  },
  {
    title: 'Quick Search',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate results' },
      { keys: ['Enter'], description: 'Select result' },
      { keys: ['Esc'], description: 'Close search' }
    ]
  }
]

const Kbd = memo(function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className='inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded border border-gray-300 dark:border-slate-700 bg-muted text-xs font-medium text-foreground/70 shadow-sm'>
      {children}
    </kbd>
  )
})

const ShortcutRow = memo(function ShortcutRow({
  shortcut
}: {
  shortcut: ShortcutEntry
}) {
  return (
    <div className='flex items-center justify-between py-2'>
      <span className='text-sm text-foreground/80'>{shortcut.description}</span>
      <div className='flex items-center gap-1'>
        {shortcut.keys.map((key, i) => (
          <span key={key} className='flex items-center gap-1'>
            {i > 0 && <span className='text-xs text-foreground/30'>+</span>}
            <Kbd>{key}</Kbd>
          </span>
        ))}
      </div>
    </div>
  )
})

export function ShortcutsHelpModal() {
  const [open, setOpen] = useState(false)

  // Register ? shortcut to open this modal
  useKeyboardShortcut(
    '?',
    useCallback(() => setOpen(true), []),
    { meta: false, shift: true, preventDefault: true }
  )

  // Listen for custom event from QuickSearch
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-shortcuts-modal', handler)
    return () => window.removeEventListener('open-shortcuts-modal', handler)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Keyboard className='h-5 w-5' aria-hidden='true' />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate QuizHub faster.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 mt-2'>
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className='text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-2'>
                {group.title}
              </h3>
              <div className='divide-y divide-gray-200 dark:divide-slate-700/50'>
                {group.shortcuts.map((shortcut) => (
                  <ShortcutRow key={shortcut.description} shortcut={shortcut} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className='mt-4 pt-3 border-t border-gray-200 dark:border-slate-700/50'>
          <p className='text-xs text-foreground/40 text-center'>
            Press <Kbd>?</Kbd> anytime to view this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
