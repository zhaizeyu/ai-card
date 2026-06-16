import Link from "next/link"
import { notFound } from "next/navigation"
import { BattleLog } from "@/components/battle/BattleLog"
import { MonsterCard } from "@/components/cards/MonsterCard"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/db"

export default async function BattleResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const battle = await prisma.battle.findUnique({
    where: { id },
    include: { playerCard: true, enemyCard: true },
  })
  if (!battle || !battle.enemyCard) notFound()

  const log = JSON.parse(battle.battleLog) as string[]
  const reward = battle.rewardJson ? (JSON.parse(battle.rewardJson) as { exp: number; component?: { name: string } | null }) : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink/50">战斗结果</p>
          <h1 className="mt-1 text-4xl font-black">
            {battle.result === "win" ? "胜利" : battle.result === "loss" ? "失败" : "平局"}
          </h1>
        </div>
        <Button asChild>
          <Link href={`/battle/${battle.playerCardId}`}>再次战斗</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_120px_1fr]">
        <MonsterCard card={battle.playerCard} compact />
        <div className="flex items-center justify-center text-3xl font-black text-ink/35">VS</div>
        <MonsterCard card={battle.enemyCard} compact />
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <BattleLog log={log} />
        <aside className="rounded-lg border border-ink/10 bg-white p-5">
          <h2 className="font-bold">奖励</h2>
          <div className="mt-4 space-y-2 text-sm text-ink/70">
            <p>经验 +{reward?.exp ?? 0}</p>
            <p>组件：{reward?.component?.name ?? "未掉落"}</p>
          </div>
        </aside>
      </section>
    </main>
  )
}
