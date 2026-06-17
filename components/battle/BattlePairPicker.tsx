"use client"

import type { Card } from "@prisma/client"
import { Check, Eye, Swords, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { MonsterCard } from "@/components/cards/MonsterCard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function BattlePairPicker({ cards }: { cards: Card[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<"solo" | "team">("solo")
  const [soloIds, setSoloIds] = useState<string[]>([])
  const [playerIds, setPlayerIds] = useState<string[]>([])
  const [enemyIds, setEnemyIds] = useState<string[]>([])
  const [editingSide, setEditingSide] = useState<"player" | "enemy">("player")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const soloCards = useMemo(() => mapCards(cards, soloIds), [cards, soloIds])
  const playerCards = useMemo(() => mapCards(cards, playerIds), [cards, playerIds])
  const enemyCards = useMemo(() => mapCards(cards, enemyIds), [cards, enemyIds])

  function toggleCard(cardId: string) {
    setError("")
    if (mode === "solo") {
      setSoloIds((current) => {
        if (current.includes(cardId)) return current.filter((id) => id !== cardId)
        if (current.length >= 2) return [current[1], cardId]
        return [...current, cardId]
      })
      return
    }

    const currentIds = editingSide === "player" ? playerIds : enemyIds
    const otherIds = editingSide === "player" ? enemyIds : playerIds
    const setCurrentIds = editingSide === "player" ? setPlayerIds : setEnemyIds

    if (otherIds.includes(cardId)) {
      setError("同一张卡不能同时在敌我队伍中")
      return
    }

    setCurrentIds((current) => {
      if (current.includes(cardId)) return current.filter((id) => id !== cardId)
      if (current.length >= 3) return [current[1], current[2], cardId]
      return [...current, cardId]
    })
  }

  async function startSimulation() {
    const payload =
      mode === "solo"
        ? { cardId: soloIds[0], opponentCardId: soloIds[1] }
        : { cardId: playerIds[0], cardIds: playerIds, opponentCardIds: enemyIds }

    if (mode === "solo" && soloIds.length !== 2) {
      setError("请选择两张卡牌进行 1v1")
      return
    }

    if (mode === "team" && (playerIds.length !== 3 || enemyIds.length !== 3)) {
      setError("3v3 需要敌我双方各选择 3 张卡牌")
      return
    }

    setLoading(true)
    setError("")
    const response = await fetch("/api/battle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = (await response.json()) as { battleId?: string; error?: string }
    setLoading(false)

    if (!response.ok || !data.battleId) {
      setError(data.error ?? "模拟失败")
      return
    }

    router.push(`/battles/${data.battleId}`)
  }

  if (!cards.length) {
    return <div className="mt-8 rounded-lg border border-dashed border-ink/20 p-8 text-center">暂无卡牌</div>
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="sticky top-0 z-10 rounded-lg border border-ink/10 bg-white/95 p-4 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-bold">模拟对战</h2>
            <p className="mt-1 text-sm text-ink/60">
              {mode === "solo"
                ? soloCards.length
                  ? soloCards.map((card, index) => `${index === 0 ? "A" : "B"}：${card.name}`).join(" / ")
                  : "选择两张卡牌进行单卡模拟"
                : `我方 ${playerCards.length}/3：${formatNames(playerCards)}；敌方 ${enemyCards.length}/3：${formatNames(enemyCards)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("solo")
                setError("")
              }}
              className={cn(
                "h-10 rounded-md border px-4 text-sm font-semibold",
                mode === "solo" ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70",
              )}
            >
              1v1
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("team")
                setError("")
              }}
              className={cn(
                "h-10 rounded-md border px-4 text-sm font-semibold",
                mode === "team" ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70",
              )}
            >
              3v3
            </button>
            {(soloIds.length || playerIds.length || enemyIds.length) ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSoloIds([])
                  setPlayerIds([])
                  setEnemyIds([])
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                清空
              </Button>
            ) : null}
            <Button
              onClick={startSimulation}
              disabled={loading || (mode === "solo" ? soloIds.length !== 2 : playerIds.length !== 3 || enemyIds.length !== 3)}
              className="gap-2"
            >
              <Swords className="h-4 w-4" />
              {loading ? "模拟中" : mode === "solo" ? "开始 1v1" : "开始 3v3"}
            </Button>
          </div>
        </div>
        {mode === "team" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditingSide("player")}
              className={cn(
                "h-9 rounded-md border px-3 text-sm font-semibold",
                editingSide === "player" ? "border-ember bg-ember text-white" : "border-ink/15 bg-white text-ink/70",
              )}
            >
              选择我方
            </button>
            <button
              type="button"
              onClick={() => setEditingSide("enemy")}
              className={cn(
                "h-9 rounded-md border px-3 text-sm font-semibold",
                editingSide === "enemy" ? "border-ember bg-ember text-white" : "border-ink/15 bg-white text-ink/70",
              )}
            >
              选择敌方
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm font-semibold text-ember">{error}</p> : null}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((card) => {
          const marker = getSelectionMarker(card.id, mode, soloIds, playerIds, enemyIds)
          const isSelected = Boolean(marker)

          return (
            <div key={card.id} className="space-y-3">
              <button
                type="button"
                onClick={() => toggleCard(card.id)}
                className={cn(
                  "relative block w-full rounded-lg text-left transition",
                  "focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2",
                  isSelected ? "ring-4 ring-ember/70" : "hover:-translate-y-0.5",
                )}
                aria-pressed={isSelected}
              >
                <MonsterCard card={card} compact />
                {isSelected ? (
                  <span className="absolute right-3 top-3 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-ember px-2 text-sm font-black text-white shadow-card">
                    <Check className="h-4 w-4" />
                    <span className="ml-1">{marker}</span>
                  </span>
                ) : null}
              </button>
              <Link
                href={`/cards/${card.id}`}
                className="inline-flex h-9 items-center rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-ink/70 hover:bg-ink/5"
              >
                <Eye className="mr-2 h-4 w-4" />
                详情
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function mapCards(cards: Card[], ids: string[]) {
  return ids.map((id) => cards.find((card) => card.id === id)).filter((card): card is Card => Boolean(card))
}

function formatNames(cards: Card[]) {
  return cards.length ? cards.map((card, index) => `${index + 1}号位 ${card.name}`).join(" / ") : "未选择"
}

function getSelectionMarker(
  cardId: string,
  mode: "solo" | "team",
  soloIds: string[],
  playerIds: string[],
  enemyIds: string[],
) {
  if (mode === "solo") {
    const index = soloIds.indexOf(cardId)
    if (index < 0) return ""
    return index === 0 ? "A" : "B"
  }

  const playerIndex = playerIds.indexOf(cardId)
  if (playerIndex >= 0) return `我${playerIndex + 1}`
  const enemyIndex = enemyIds.indexOf(cardId)
  if (enemyIndex >= 0) return `敌${enemyIndex + 1}`
  return ""
}
