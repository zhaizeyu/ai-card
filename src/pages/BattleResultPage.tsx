import { Link, useNavigate, useParams } from "react-router-dom"
import { useEffect } from "react"
import { BattleLog } from "@/components/battle/BattleLog"
import { MonsterCard } from "@/components/cards/MonsterCard"
import { Button } from "@/components/ui/button"
import { useGameStore } from "@/src/store/game-store"

export default function BattleResultPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const battle = useGameStore((state) => state.currentBattle)
  const loadBattle = useGameStore((state) => state.loadBattle)
  const error = useGameStore((state) => state.error)

  useEffect(() => {
    if (!id) {
      navigate("/404", { replace: true })
      return
    }
    void loadBattle(id)
  }, [id, loadBattle, navigate])

  if (!battle) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-ink/60">{error ?? "加载中..."}</main>
  }

  const reward = battle.rewardJson

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
          <Link to={`/battle/${battle.playerCardId}`}>再次战斗</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_120px_1fr]">
        <MonsterCard card={battle.playerCard} compact />
        <div className="flex items-center justify-center text-3xl font-black text-ink/35">VS</div>
        {battle.enemyCard ? <MonsterCard card={battle.enemyCard} compact /> : <div />}
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        <BattleLog log={battle.battleLog} />
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
