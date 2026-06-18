"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DeleteCardButton({
  cardId,
  cardName,
  redirectTo,
  className,
}: {
  cardId: string
  cardName: string
  redirectTo?: string
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function deleteCard() {
    const confirmed = window.confirm(`删除「${cardName}」？相关战斗记录和小世界队伍记录也会一起删除。`)
    if (!confirmed) return

    setLoading(true)
    setError("")

    const response = await fetch(`/api/cards/${cardId}`, { method: "DELETE" })
    const data = (await response.json()) as { error?: string }

    setLoading(false)

    if (!response.ok) {
      setError(data.error ?? "删除失败")
      return
    }

    if (redirectTo) {
      router.push(redirectTo)
    } else {
      router.refresh()
    }
  }

  return (
    <div className={cn("inline-flex flex-col items-start gap-2", className)}>
      <Button type="button" variant="secondary" onClick={deleteCard} disabled={loading} className="gap-2 border-ember/30 text-ember hover:bg-ember/5">
        <Trash2 className="h-4 w-4" />
        {loading ? "删除中" : "删除"}
      </Button>
      {error ? <span className="text-sm font-semibold text-ember">{error}</span> : null}
    </div>
  )
}
