import type { BattleDetail, CardSummary, WorldPageData } from "@/src/types/game"

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const data = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? "请求失败")
  }

  return data
}

export async function fetchCards(params: { limit?: number; rarity?: string; element?: string } = {}) {
  const search = new URLSearchParams()
  if (params.limit) search.set("limit", String(params.limit))
  if (params.rarity) search.set("rarity", params.rarity)
  if (params.element) search.set("element", params.element)
  const result = await requestJson<{ cards: CardSummary[] }>(`/api/cards${search.toString() ? `?${search}` : ""}`)
  return result.cards
}

export async function fetchCard(id: string) {
  const result = await requestJson<{ card: CardSummary }>(`/api/cards/${id}`)
  return result.card
}

export async function fetchBattle(id: string) {
  const result = await requestJson<{ battle: BattleDetail }>(`/api/battles/${id}`)
  return result.battle
}

export async function fetchWorld() {
  return requestJson<WorldPageData>("/api/world")
}

export async function createCard(prompt: string) {
  const result = await requestJson<{ cardId: string }>("/api/generate-card", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  })
  return result.cardId
}

export async function startBattle(payload: Record<string, unknown>) {
  const result = await requestJson<{ battleId: string }>("/api/battle", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return result.battleId
}

export async function postWorldAction(body: Record<string, unknown>) {
  return requestJson<{ ok?: boolean; battleId?: string; result?: string }>("/api/world", {
    method: "POST",
    body: JSON.stringify(body),
  })
}
