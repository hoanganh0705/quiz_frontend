import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Twitter, Facebook, Linkedin, Copy, Check } from 'lucide-react'
import {
  ShareResultsTabProps,
  SharePreviewProps,
  ShareButtonsProps,
  ChallengeFriendsProps
} from '@/types/quizResults'

export default function ShareResultsTab({
  quiz,
  result,
  copied,
  onCopyLink,
  onShare,
  formatTime
}: ShareResultsTabProps) {
  return (
    <Card className='py-6'>
      <CardHeader>
        <CardTitle>Share Your Results</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Share Preview */}
        <SharePreview quiz={quiz} result={result} formatTime={formatTime} />

        {/* Share Buttons */}
        <ShareButtons
          copied={copied}
          onCopyLink={onCopyLink}
          onShare={onShare}
        />

        {/* Challenge Friends */}
        <ChallengeFriends
          quizId={quiz.id}
          copied={copied}
          onCopyLink={onCopyLink}
        />
      </CardContent>
    </Card>
  )
}

function SharePreview({ quiz, result, formatTime }: SharePreviewProps) {
  return (
    <div className='bg-linear-to-br from-default to-default/80 rounded-xl p-6 text-white mb-6'>
      <div className='text-center'>
        <Trophy className='w-12 h-12 mx-auto mb-3' />
        <h3 className='text-2xl font-bold mb-2'>I scored {result.score}%!</h3>
        <p className='text-white/80 mb-4'>on &quot;{quiz.title}&quot;</p>
        <div className='flex justify-center gap-4 text-sm'>
          <span>
            ✅ {result.correctCount}/{quiz.questions.length} Correct
          </span>
          <span>⏱️ {formatTime(result.timeTaken)}</span>
        </div>
      </div>
    </div>
  )
}

function ShareButtons({ copied, onCopyLink, onShare }: ShareButtonsProps) {
  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
      <Button
        variant='outline'
        className='flex items-center gap-2'
        onClick={() => onShare('twitter')}
        aria-label='Share on Twitter'
      >
        <Twitter className='w-5 h-5 text-[#1DA1F2]' aria-hidden='true' />
        Twitter
      </Button>
      <Button
        variant='outline'
        className='flex items-center gap-2'
        onClick={() => onShare('facebook')}
        aria-label='Share on Facebook'
      >
        <Facebook className='w-5 h-5 text-[#4267B2]' aria-hidden='true' />
        Facebook
      </Button>
      <Button
        variant='outline'
        className='flex items-center gap-2'
        onClick={() => onShare('linkedin')}
        aria-label='Share on LinkedIn'
      >
        <Linkedin className='w-5 h-5 text-[#0077B5]' aria-hidden='true' />
        LinkedIn
      </Button>
      <Button
        variant='outline'
        className='flex items-center gap-2'
        onClick={onCopyLink}
        aria-label={copied ? 'Link copied' : 'Copy quiz link'}
      >
        {copied ? (
          <Check className='w-5 h-5 text-green-500' aria-hidden='true' />
        ) : (
          <Copy className='w-5 h-5' aria-hidden='true' />
        )}
        {copied ? 'Copied!' : 'Copy Link'}
      </Button>
    </div>
  )
}

function ChallengeFriends({
  quizId,
  copied,
  onCopyLink
}: ChallengeFriendsProps) {
  return (
    <div className='mt-6 p-4 bg-foreground/5 rounded-lg'>
      <h4 className='font-semibold mb-2'>Challenge Your Friends!</h4>
      <p className='text-sm text-foreground/70 mb-4'>
        Share the quiz link and see who can beat your score.
      </p>
      <div className='flex gap-2'>
        <input
          type='text'
          readOnly
          aria-label='Quiz share link'
          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/quizzes/${quizId}`}
          className='flex-1 px-3 py-2 rounded-lg bg-background border border-foreground/20 text-sm'
        />
        <Button
          onClick={onCopyLink}
          aria-label={copied ? 'Link copied' : 'Copy quiz link'}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
