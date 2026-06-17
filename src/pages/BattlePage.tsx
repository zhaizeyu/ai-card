import { useNavigate, useParams } from "react-router-dom"
import { useEffect } from "react"
import { BattleStarter } from "@/components/battle/BattleStarter"
import { MonsterCard } from "@/components/cards/MonsterCard"
import { Panel } from "@/components/ui/card"
import { useGameStore } from "@/src/store/game-store"

export default function BattlePage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const card = useGameStore((state) => state.currentCard)
  const loadCard = useGameStore((state) => state.loadCard)
  const error = useGameStore((state) => state.error)

  useEffect(() => {
    if (!id) {
      navigate("/404", { replace: true })
      return
    }
    void loadCard(id)
  }, [id, loadCard, navigate])

  if (!card) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-ink/60">{error ?? "加载中..."}</main>
  }

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
