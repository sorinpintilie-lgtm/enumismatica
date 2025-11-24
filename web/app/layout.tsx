import type { Metadata } from 'next'
import './globals.css'
import Navigation from './components/Navigation'
import ClientProvider from './components/ClientProvider'

export const metadata: Metadata = {
  title: 'E-numismatica - Magazin de Monede & Licitatii',
  description: 'Cumpara si vinde articole numismatice prin magazinul si platforma noastra de licitatii',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <body className="antialiased text-slate-900 selection:bg-amber-100 selection:text-amber-900">
        <ClientProvider>
          <Navigation />
          <main className="min-h-screen">
            {children}
          </main>
        </ClientProvider>
      </body>
    </html>
  )
}
