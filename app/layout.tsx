import type { Metadata } from 'next'
import { Cinzel, Noto_Serif_SC } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '600', '700'],
})

const _notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  variable: '--font-noto-serif-sc',
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  title: '魔物娘娼馆',
  description: '基于 AI 的魔物娘娼馆经营模拟器',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${_cinzel.variable} ${_notoSerifSC.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
