import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fitness Admin Dashboard',
  description: 'Admin panel for fitness app management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="bg-dark-bg text-white antialiased">
        {children}
      </body>
    </html>
  )
}
