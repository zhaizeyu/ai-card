import { Link, useNavigate, useParams } from "react-router-dom"
import { useEffect } from "react"
import { MonsterCard } from "@/components/cards/MonsterCard"
import { Button } from "@/components/ui/button"
import { getComponentById } from "@/lib/card/components"
import { getExpNeed } from "@/lib/card/card-progression"
import { useGameStore } from "@/src/store/game-store"

export default function CardDetailPage() {
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

  const passive = getComponentById(card.passiveComponent)
  const upgrade = getComponentById(card.upgradeComponent)
  const expNeed = getExpNeed(card.level)

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
          <div>被动组件：{card.passiveUnlocked ? passive?.name ?? "已解锁" : "Lv.5 解锁"}</div>
          <div>强化组件：{card.upgradeUnlocked ? upgrade?.name ?? "已解锁" : "Lv.7 解锁"}</div>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">成长进度</span>
            <span className="font-black">
              Lv.{card.level} · {card.exp}/{expNeed} EXP
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-moss" style={{ width: `${Math.min(100, (card.exp / expNeed) * 100)}%` }} />
          </div>
          <div className="mt-4 grid gap-2 text-sm text-ink/65 md:grid-cols-4">
            <span className={card.level >= 3 ? "font-bold text-ink" : ""}>Lv.3 技能强度</span>
            <span className={card.level >= 5 ? "font-bold text-ink" : ""}>Lv.5 被动组件</span>
            <span className={card.level >= 7 ? "font-bold text-ink" : ""}>Lv.7 强化组件</span>
            <span className={card.level >= 10 ? "font-bold text-ink" : ""}>Lv.10 称号</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to={`/battle/${card.id}`}>进入战斗</Link>
          </Button>
          <Link className="inline-flex h-10 items-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold" to="/world">
            加入小世界
          </Link>
          <Link className="inline-flex h-10 items-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold" to="/create">
            再生成一张
          </Link>
        </div>
      </section>
    </main>
  )
}
