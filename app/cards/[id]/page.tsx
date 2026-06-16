import Link from "next/link"
import { notFound } from "next/navigation"
import { MonsterCard } from "@/components/cards/MonsterCard"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/db"

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card) notFound()

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[420px_1fr]">
      <MonsterCard card={card} />
      <section className="space-y-6">
        <div>
          <h1 className="text-4xl font-black">{card.name}</h1>
          <p className="mt-3 leading-7 text-ink/70">{card.description}</p>
        </div>
        <div className="grid gap-3 rounded-lg border border-ink/10 bg-white p-5 text-sm text-ink/70 md:grid-cols-2">
          <div>原始描述：{card.prompt}</div>
          <div>规则强度：{card.powerScore}</div>
          <div>成长方向：{card.growthType}</div>
          <div>称号：{card.title ?? "未获得"}</div>
          <div>真实效果：{card.effect}</div>
          <div>冷却：{card.cooldown} 回合</div>
          <div>被动组件槽：{card.passiveUnlocked ? "已解锁" : "Lv.5 解锁"}</div>
          <div>强化组件：{card.upgradeUnlocked ? "已解锁" : "Lv.7 解锁"}</div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/battle/${card.id}`}>进入战斗</Link>
          </Button>
          <Link className="inline-flex h-10 items-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold" href="/create">
            再生成一张
          </Link>
        </div>
      </section>
    </main>
  )
}
