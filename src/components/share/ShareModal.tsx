'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import {
  Copy,
  Check,
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Send,
  QrCode,
  Link2,
  Share2,
  Download
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useShare } from '@/hooks/use-share'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShareModalProps {
  title: string
  description?: string
  url: string
  children: React.ReactNode
}

interface SocialButtonProps {
  icon: React.ReactNode
  label: string
  color: string
  onClick: () => void
}

interface EmailInviteFormProps {
  quizTitle: string
  shareUrl: string
}

// ─── ShareModal ──────────────────────────────────────────────────────────────

export function ShareModal({
  title,
  description,
  url,
  children
}: ShareModalProps) {
  const [open, setOpen] = useState(false)
  const { shareUrl, copied, copyLink, openSocial } = useShare({
    title,
    description,
    url
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-md md:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Share2 className='w-5 h-5' aria-hidden='true' />
            Share &quot;{title}&quot;
          </DialogTitle>
          <DialogDescription>
            Share this quiz with friends via link, social media, QR code, or
            email invite.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue='link' className='w-full'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='link' className='text-xs sm:text-sm'>
              <Link2 className='w-4 h-4 mr-1' aria-hidden='true' />
              Link
            </TabsTrigger>
            <TabsTrigger value='social' className='text-xs sm:text-sm'>
              <Share2 className='w-4 h-4 mr-1' aria-hidden='true' />
              Social
            </TabsTrigger>
            <TabsTrigger value='qr' className='text-xs sm:text-sm'>
              <QrCode className='w-4 h-4 mr-1' aria-hidden='true' />
              QR Code
            </TabsTrigger>
            <TabsTrigger value='email' className='text-xs sm:text-sm'>
              <Mail className='w-4 h-4 mr-1' aria-hidden='true' />
              Invite
            </TabsTrigger>
          </TabsList>

          {/* ─── Link Tab ─────────────────────────────────────────── */}
          <TabsContent value='link' className='space-y-4 mt-4'>
            <div className='flex gap-2'>
              <Input
                readOnly
                value={shareUrl}
                aria-label='Share link'
                className='font-mono text-sm'
              />
              <Button
                onClick={copyLink}
                variant='outline'
                className='shrink-0'
                aria-label={copied ? 'Link copied' : 'Copy link'}
              >
                {copied ? (
                  <>
                    <Check className='w-4 h-4 mr-1 text-green-500' />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className='w-4 h-4 mr-1' />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>
              Anyone with this link can access the quiz.
            </p>
          </TabsContent>

          {/* ─── Social Tab ───────────────────────────────────────── */}
          <TabsContent value='social' className='mt-4'>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
              <SocialButton
                icon={<Twitter className='w-5 h-5' />}
                label='Twitter / X'
                color='bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2]'
                onClick={() => openSocial('twitter')}
              />
              <SocialButton
                icon={<Facebook className='w-5 h-5' />}
                label='Facebook'
                color='bg-[#4267B2]/10 hover:bg-[#4267B2]/20 text-[#4267B2]'
                onClick={() => openSocial('facebook')}
              />
              <SocialButton
                icon={<Linkedin className='w-5 h-5' />}
                label='LinkedIn'
                color='bg-[#0077B5]/10 hover:bg-[#0077B5]/20 text-[#0077B5]'
                onClick={() => openSocial('linkedin')}
              />
              <SocialButton
                icon={<MessageCircle className='w-5 h-5' />}
                label='WhatsApp'
                color='bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366]'
                onClick={() => openSocial('whatsapp')}
              />
              <SocialButton
                icon={<Send className='w-5 h-5' />}
                label='Telegram'
                color='bg-[#0088CC]/10 hover:bg-[#0088CC]/20 text-[#0088CC]'
                onClick={() => openSocial('telegram')}
              />
              <SocialButton
                icon={<Mail className='w-5 h-5' />}
                label='Email'
                color='bg-foreground/5 hover:bg-foreground/10 text-foreground'
                onClick={() => openSocial('email')}
              />
            </div>
          </TabsContent>

          {/* ─── QR Code Tab ──────────────────────────────────────── */}
          <TabsContent value='qr' className='mt-4'>
            <QRCodeDisplay url={shareUrl} title={title} />
          </TabsContent>

          {/* ─── Email Invite Tab ─────────────────────────────────── */}
          <TabsContent value='email' className='mt-4'>
            <EmailInviteForm quizTitle={title} shareUrl={shareUrl} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ─── SocialButton ────────────────────────────────────────────────────────────

const SocialButton = memo(function SocialButton({
  icon,
  label,
  color,
  onClick
}: SocialButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${color} cursor-pointer`}
      aria-label={`Share on ${label}`}
    >
      {icon}
      <span className='text-sm font-medium'>{label}</span>
    </button>
  )
})

// ─── QRCodeDisplay ───────────────────────────────────────────────────────────

const QR_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/'

function QRCodeDisplay({ url, title }: { url: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrSize = 200
  const qrUrl = `${QR_API_BASE}?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}&format=png`

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const padding = 32
      const textHeight = 40
      canvas.width = qrSize + padding * 2
      canvas.height = qrSize + padding * 2 + textHeight

      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // QR code
      ctx.drawImage(img, padding, padding, qrSize, qrSize)

      // Title text
      ctx.fillStyle = '#1e293b'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(title, canvas.width / 2, qrSize + padding + 28)

      // Download
      const link = document.createElement('a')
      link.download = `quiz-qr-${title.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = qrUrl
  }, [qrUrl, qrSize, title])

  return (
    <div className='flex flex-col items-center gap-4'>
      <div className='bg-white p-4 rounded-xl shadow-sm border'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt={`QR code for ${title}`}
          width={qrSize}
          height={qrSize}
          className='rounded'
        />
      </div>
      <p className='text-sm text-muted-foreground text-center'>
        Scan this QR code to open the quiz on any device.
      </p>
      <Button variant='outline' onClick={handleDownload} className='gap-2'>
        <Download className='w-4 h-4' />
        Download QR Code
      </Button>
      <canvas ref={canvasRef} className='hidden' aria-hidden='true' />
    </div>
  )
}

// ─── EmailInviteForm ─────────────────────────────────────────────────────────

function EmailInviteForm({ quizTitle, shareUrl }: EmailInviteFormProps) {
  const [emails, setEmails] = useState('')
  const [message, setMessage] = useState(
    `Hey! I found this awesome quiz "${quizTitle}" and thought you'd enjoy it. Check it out!`
  )
  const [sent, setSent] = useState(false)

  const handleSend = useCallback(() => {
    if (!emails.trim()) return

    const emailList = emails
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map((e) => e.trim())

    const subject = encodeURIComponent(
      `You're invited to take the "${quizTitle}" quiz!`
    )
    const body = encodeURIComponent(`${message}\n\n${shareUrl}`)
    const mailto = `mailto:${emailList.join(',')}?subject=${subject}&body=${body}`

    window.location.href = mailto

    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }, [emails, message, quizTitle, shareUrl])

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='invite-emails'>Email addresses</Label>
        <Input
          id='invite-emails'
          placeholder='friend1@email.com, friend2@email.com'
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
        />
        <p className='text-xs text-muted-foreground'>
          Separate multiple emails with commas.
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='invite-message'>Personal message</Label>
        <Textarea
          id='invite-message'
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <Button onClick={handleSend} disabled={!emails.trim()} className='w-full'>
        {sent ? (
          <>
            <Check className='w-4 h-4 mr-2' />
            Invite Sent!
          </>
        ) : (
          <>
            <Send className='w-4 h-4 mr-2' />
            Send Invite
          </>
        )}
      </Button>
    </div>
  )
}
