import type { Metadata } from 'next'
import './globals.css'
import ClientProvider from './components/ClientProvider'
import NavigationWrapper from './components/NavigationWrapper'
import ScrollToTop from './components/ScrollToTop'
 
export const metadata: Metadata = {
  title: 'eNumismatica - Magazin de Monede & Licitatii',
  description: 'Cumpara si vinde articole numismatice prin magazinul si platforma noastra de licitatii',
  icons: {
    icon: '/eNumismatica.ro_logo.ico',
    shortcut: '/eNumismatica.ro_logo.ico',
  },
}
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <body className="antialiased text-white selection:bg-gold-500 selection:text-navy-900 bg-gradient-to-b from-navy-500 via-navy-600 to-navy-900">
        <ScrollToTop />
        <ClientProvider>
          <NavigationWrapper />
          <main className="min-h-screen">
            {children}
          </main>
        </ClientProvider>
      </body>
    </html>
  )
}
