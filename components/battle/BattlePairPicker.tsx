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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedCards = useMemo(
    () => selectedIds.map((id) => cards.find((card) => card.id === id)).filter((card): card is Card => Boolean(card)),
    [cards, selectedIds],
  )

  function toggleCard(cardId: string) {
    setError("")
    setSelectedIds((current) => {
      if (current.includes(cardId)) return current.filter((id) => id !== cardId)
      if (current.length >= 2) return [current[1], cardId]
      return [...current, cardId]
    })
  }

  async function startSimulation() {
    if (selectedIds.length !== 2) {
      setError("请选择两张卡牌")
      return
    }

    setLoading(true)
    setError("")
    const response = await fetch("/api/battle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cardId: selectedIds[0], opponentCardId: selectedIds[1] }),
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
              {selectedCards.length
                ? selectedCards.map((card, index) => `${index === 0 ? "A" : "B"}：${card.name}`).join(" / ")
                : "从下方任选两张卡牌"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCards.length ? (
              <Button variant="secondary" onClick={() => setSelectedIds([])} className="gap-2">
                <X className="h-4 w-4" />
                清空
              </Button>
            ) : null}
            <Button onClick={startSimulation} disabled={loading || selectedIds.length !== 2} className="gap-2">
              <Swords className="h-4 w-4" />
              {loading ? "模拟中" : "开始模拟"}
            </Button>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-ember">{error}</p> : null}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((card) => {
          const selectedIndex = selectedIds.indexOf(card.id)
          const isSelected = selectedIndex >= 0

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
                    <span className="ml-1">{selectedIndex === 0 ? "A" : "B"}</span>
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
