"use client"

import { Swords } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function BattleStarter({ cardId }: { cardId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function startBattle() {
    setLoading(true)
    setError("")
    const response = await fetch("/api/battle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cardId }),
    })
    const data = (await response.json()) as { battleId?: string; error?: string }
    setLoading(false)

    if (!response.ok || !data.battleId) {
      setError(data.error ?? "战斗失败")
      return
    }

    router.push(`/battles/${data.battleId}`)
  }

  return (
    <div className="space-y-3">
      <Button onClick={startBattle} disabled={loading} className="gap-2">
        <Swords className="h-4 w-4" />
        {loading ? "战斗结算中" : "开始 1v1 自动战斗"}
      </Button>
      {error ? <p className="text-sm font-semibold text-ember">{error}</p> : null}
    </div>
  )
}
