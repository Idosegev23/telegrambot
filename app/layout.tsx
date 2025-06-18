import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Telegram Bot Manager - TriRoars',
  description: 'Professional multi-language sports content management for Telegram bots',
  keywords: ['telegram', 'bot', 'sports', 'ethiopia', 'amharic', 'swahili', 'football'],
  authors: [{ name: 'TriRoars Team' }],
  openGraph: {
    title: 'Telegram Bot Manager - TriRoars',
    description: 'Professional sports content management for African markets',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  )
}