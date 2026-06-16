import type { Metadata } from "next"
import Link from "next/link"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI 怪物卡牌",
  description: "AI 生成怪物卡 + 组件化自动战斗 MVP",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="border-b border-ink/10 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-black tracking-wide">
              AI Monster Cards
            </Link>
            <div className="flex items-center gap-4 text-sm font-semibold text-ink/70">
              <Link href="/create">生成</Link>
              <Link href="/gallery">图鉴</Link>
              <Link href="/world">小世界</Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
