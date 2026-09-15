import type { Metadata } from 'next'
import './globals.css'
import FloatingSidebar from '@/components/FloatingSidebar'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'FitApp Admin Dashboard',
  description: 'Admin panel for fitness app management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="bg-[#0A0A0A] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
