'use client'

import { useEffect } from 'react'

const APPLE_STORE_URL = 'https://apps.apple.com/us/app/enumismatica-ro/id6758997496'
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store/apps'
const FALLBACK_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enumismatica.ro'

export default function AppDownloadRedirectPage() {
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || ''
    const isAndroid = /android/i.test(ua)
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    const targetUrl = isAndroid ? PLAY_STORE_URL : isIOS ? APPLE_STORE_URL : FALLBACK_URL

    window.location.replace(targetUrl)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center text-slate-200">
      <p>Redirecting you to the app...</p>
    </div>
  )
}
