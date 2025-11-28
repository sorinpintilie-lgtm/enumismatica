'use client'

import { usePathname } from 'next/navigation'
import Navigation from './Navigation'

export default function NavigationWrapper() {
  const pathname = usePathname()

  // Hide global navigation on special QR event pages
  if (pathname?.startsWith('/event')) {
    return null
  }

  return <Navigation />
}