import type { Metadata } from "next"
import { PrefetchLink } from "@/components/navigation/PrefetchLink"
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
            <PrefetchLink href="/" className="text-sm font-black tracking-wide">
              AI Monster Cards
            </PrefetchLink>
            <div className="flex items-center gap-4 text-sm font-semibold text-ink/70">
              <PrefetchLink href="/create">生成</PrefetchLink>
              <PrefetchLink href="/gallery">图鉴</PrefetchLink>
              <PrefetchLink href="/components">组件</PrefetchLink>
              <PrefetchLink href="/world">小世界</PrefetchLink>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
