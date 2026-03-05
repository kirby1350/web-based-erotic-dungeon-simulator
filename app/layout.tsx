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
  title: 'API 配置中心',
  description: '管理文字模型与图片生成模型的 API 密钥和预设参数',
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
