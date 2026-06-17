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
  const playerTeam = battle.playerTeamJson
    ? (JSON.parse(battle.playerTeamJson) as Array<{ cardId: string; name: string; position: number; hp: number; maxHp: number; alive: boolean }>)
    : null
  const enemyTeam = battle.enemyTeamJson
    ? (JSON.parse(battle.enemyTeamJson) as Array<{ cardId: string; name: string; position: number; hp: number; maxHp: number; alive: boolean }>)
    : null
  const reward = battle.rewardJson
    ? (JSON.parse(battle.rewardJson) as {
        exp: number
        component?: { name: string } | null
        levelsGained?: number
        level?: number
        unlocked?: string[]
        title?: string | null
        bondGained?: number
        teamBond?: Array<{ cardId: string; bond: number }>
        team?: Array<{
          cardId: string
          exp: number
          levelsGained: number
          level: number
          unlocked: string[]
          title?: string | null
        }>
      })
    : null

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

      {battle.mode === "team" && playerTeam && enemyTeam ? (
        <div className="grid gap-6 md:grid-cols-[1fr_120px_1fr]">
          <TeamPanel title="玩家小队" team={playerTeam} />
          <div className="flex items-center justify-center text-3xl font-black text-ink/35">VS</div>
          <TeamPanel title="敌方小队" team={enemyTeam} />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_120px_1fr]">
          <MonsterCard card={battle.playerCard} compact />
          <div className="flex items-center justify-center text-3xl font-black text-ink/35">VS</div>
          <MonsterCard card={battle.enemyCard} compact />
        </div>
      )}

      <section className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <BattleLog log={log} />
        <aside className="rounded-lg border border-ink/10 bg-white p-5">
          <h2 className="font-bold">奖励</h2>
          <div className="mt-4 space-y-2 text-sm text-ink/70">
            <p>经验 +{reward?.exp ?? 0}</p>
            {reward?.team?.length ? (
              <div className="space-y-1">
                {reward.team.map((item) => (
                  <p key={item.cardId}>
                    参战卡 Lv.{item.level}
                    {item.levelsGained ? `，提升 ${item.levelsGained} 级` : ""}
                    {item.unlocked.length ? `，解锁 ${item.unlocked.join("、")}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
            {reward?.levelsGained ? <p>升级：Lv.{reward.level}</p> : null}
            {reward?.unlocked?.length ? <p>解锁：{reward.unlocked.join("、")}</p> : null}
            {reward?.title ? <p>称号：{reward.title}</p> : null}
            {reward?.bondGained ? <p>队伍羁绊 +{reward.bondGained}</p> : null}
            {reward?.teamBond?.length ? (
              <div className="space-y-1">
                {reward.teamBond.map((item) => (
                  <p key={item.cardId}>参战羁绊达到 {item.bond}</p>
                ))}
              </div>
            ) : null}
            <p>组件：{reward?.component?.name ?? "未掉落"}</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

function TeamPanel({
  title,
  team,
}: {
  title: string
  team: Array<{ cardId: string; name: string; position: number; hp: number; maxHp: number; alive: boolean }>
}) {
  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-card">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {team.map((fighter) => (
          <div key={fighter.cardId} className="rounded-md border border-ink/10 bg-ink/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-ink/45">{fighter.position + 1}号位</p>
                <p className="font-semibold">{fighter.name}</p>
              </div>
              <span className="text-sm font-bold text-ink/60">{fighter.alive ? "存活" : "倒下"}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-ember"
                style={{ width: `${Math.max(0, Math.min(100, (fighter.hp / fighter.maxHp) * 100))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink/55">
              HP {fighter.hp}/{fighter.maxHp}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
