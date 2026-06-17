"use client"

import { WandSparkles } from "lucide-react"
import { FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

export function GenerateCardForm() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")

    const response = await fetch("/api/generate-card", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
    const data = (await response.json()) as { cardId?: string; error?: string }

    setLoading(false)
    if (!response.ok || !data.cardId) {
      setError(data.error ?? "生成失败")
      return
    }

    navigate(`/cards/${data.cardId}`)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="min-h-36 w-full resize-none rounded-lg border border-ink/15 bg-white p-4 text-base outline-none ring-ink/15 transition focus:ring-4"
        placeholder="例如：灭世巨龙，攻击是恶龙吐息"
      />
      {error ? <p className="text-sm font-semibold text-ember">{error}</p> : null}
      <Button type="submit" disabled={loading} className="gap-2">
        <WandSparkles className="h-4 w-4" />
        {loading ? "生成中" : "生成怪物卡"}
      </Button>
    </form>
  )
}
