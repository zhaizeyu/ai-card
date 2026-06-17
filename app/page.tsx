import Link from "next/link"
import { ArrowRight, Sparkles, Swords, Telescope } from "lucide-react"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/db"
import { MonsterCard } from "@/components/cards/MonsterCard"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const latestCards = await prisma.card.findMany({ orderBy: { createdAt: "desc" }, take: 3 })

  return (
    <main>
      <section className="border-b border-ink/10 bg-[linear-gradient(135deg,#f7f2e8_0%,#d9e9e7_52%,#f3d8ca_100%)]">
        <div className="mx-auto grid min-h-[540px] max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-4 inline-flex rounded bg-white/70 px-3 py-1 text-sm font-semibold text-ink/70">
              AI 生成外壳，系统控制规则
            </p>
            <h1 className="max-w-2xl text-5xl font-black leading-tight md:text-6xl">
              AI 怪物卡牌生成与自动战斗
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink/70">
              输入一句怪物描述，生成受控数值、组件化技能和可自动结算的战斗日志。小世界养成结构已经预留。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="gap-2">
                <Link href="/create">
                  开始生成 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Link className="inline-flex h-10 items-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold" href="/gallery">
                查看图鉴
              </Link>
              <Link className="inline-flex h-10 items-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold" href="/world">
                进入小世界
              </Link>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-lg border border-white/60 bg-white/60 p-4 shadow-card backdrop-blur">
              <Sparkles className="h-5 w-5 text-ember" />
              <h2 className="mt-3 font-bold">表现层由 AI 生成</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">名称、种族、技能文案和背景故事保留惊喜感。</p>
            </div>
            <div className="rounded-lg border border-white/60 bg-white/60 p-4 shadow-card backdrop-blur">
              <Swords className="h-5 w-5 text-tide" />
              <h2 className="mt-3 font-bold">规则层由系统结算</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">稀有度、数值、技能效果、状态和胜负都在代码中控制。</p>
            </div>
            <div className="rounded-lg border border-white/60 bg-white/60 p-4 shadow-card backdrop-blur">
              <Telescope className="h-5 w-5 text-moss" />
              <h2 className="mt-3 font-bold">预留小世界循环</h2>
              <p className="mt-1 text-sm leading-6 text-ink/65">卡牌、战斗与事件可以继续扩展成养成容器。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black">最新卡牌</h2>
            <p className="mt-1 text-sm text-ink/60">生成后会自动出现在这里。</p>
          </div>
          <Link href="/gallery" className="text-sm font-semibold text-ink/70">
            全部
          </Link>
        </div>
        {latestCards.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {latestCards.map((card) => (
              <Link key={card.id} href={`/cards/${card.id}`}>
                <MonsterCard card={card} compact />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-ink/20 bg-white/60 p-8 text-center text-ink/60">
            还没有卡牌。先生成第一张怪物卡。
          </div>
        )}
      </section>
    </main>
  )
}
