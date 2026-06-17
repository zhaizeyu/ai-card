import { notFound } from "next/navigation"
import { BattleStarter } from "@/components/battle/BattleStarter"
import { MonsterCard } from "@/components/cards/MonsterCard"
import { Panel } from "@/components/ui/card"
import { prisma } from "@/lib/db"

export const revalidate = 30

export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card) notFound()

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[420px_1fr]">
      <MonsterCard card={card} />
      <Panel className="flex min-h-80 flex-col justify-center p-6">
        <p className="text-sm font-semibold text-ink/50">1v1 自动战斗</p>
        <h1 className="mt-2 text-4xl font-black">派出 {card.name}</h1>
        <p className="mt-4 max-w-xl leading-7 text-ink/70">
          系统会生成一名敌人，按速度排序行动，最多 10 回合。战斗日志不会调用 LLM，所有伤害和状态由规则引擎结算。
        </p>
        <div className="mt-8">
          <BattleStarter cardId={card.id} />
        </div>
      </Panel>
    </main>
  )
}
