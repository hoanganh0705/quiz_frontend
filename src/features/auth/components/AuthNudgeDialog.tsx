'use client'

import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/AlertDialog'

interface AuthNudgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  onSecondary: () => void
}

export function AuthNudgeDialog({
  open,
  onOpenChange,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  onSecondary
}: AuthNudgeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSecondary}>
            {secondaryLabel}
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
