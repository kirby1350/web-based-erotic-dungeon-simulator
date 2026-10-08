import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import '@fontsource-variable/cinzel'
import '@fontsource-variable/noto-serif-sc'
import './globals.css'

export const metadata: Metadata = {
  title: '地下城探险模拟器',
  description: '一款基于AI的文字地下城角色扮演冒险游戏',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
