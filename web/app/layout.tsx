import type { Metadata, Viewport } from 'next'
import './globals.css'
import ClientProvider from './components/ClientProvider'
import NavigationWrapper from './components/NavigationWrapper'
import ScrollToTop from './components/ScrollToTop'
import LoadingSpinner from './components/LoadingSpinner'
import Footer from './components/Footer'
 
export const metadata: Metadata = {
  title: 'eNumismatica - Magazin de Monede & Licitatii',
  description: 'Cumpara si vinde piese numismatice prin magazinul si platforma noastra de licitatii',
  icons: {
    icon: '/eNumismatica.ro_logo.ico',
    shortcut: '/eNumismatica.ro_logo.ico',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="antialiased text-white selection:bg-gold-500 selection:text-navy-900 bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900">
        <ScrollToTop />
        <ClientProvider>
          <NavigationWrapper />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </ClientProvider>
      </body>
    </html>
  )
}
