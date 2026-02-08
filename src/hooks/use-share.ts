import { useCallback, useMemo } from 'react'
import { useClipboard } from './use-clipboard'

interface ShareData {
  title: string
  description?: string
  url: string
}

/**
 * Hook for generating share URLs and handling social sharing
 * @param data - Title, description, and URL to share
 */
export function useShare(data: ShareData) {
  const { copied, copy } = useClipboard()

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return data.url
    // Convert relative URLs to absolute
    if (data.url.startsWith('/')) {
      return `${window.location.origin}${data.url}`
    }
    return data.url
  }, [data.url])

  const copyLink = useCallback(() => {
    copy(shareUrl)
  }, [copy, shareUrl])

  const socialUrls = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedTitle = encodeURIComponent(data.title)
    const encodedDesc = encodeURIComponent(data.description ?? '')

    return {
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`
    }
  }, [shareUrl, data.title, data.description])

  const openSocial = useCallback(
    (platform: keyof typeof socialUrls) => {
      const url = socialUrls[platform]
      if (platform === 'email') {
        window.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400')
      }
    },
    [socialUrls]
  )

  return { shareUrl, copied, copyLink, socialUrls, openSocial }
}
