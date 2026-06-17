import { create } from "zustand"
import { fetchBattle, fetchCard, fetchCards, fetchWorld } from "@/src/lib/api"
import type { BattleDetail, CardSummary, WorldPageData } from "@/src/types/game"

type GameStore = {
  homeCards: CardSummary[]
  galleryCards: CardSummary[]
  currentCard: CardSummary | null
  currentBattle: BattleDetail | null
  worldData: WorldPageData | null
  loading: string | null
  error: string | null
  loadHomeCards: () => Promise<void>
  loadGalleryCards: () => Promise<void>
  loadCard: (id: string) => Promise<void>
  loadBattle: (id: string) => Promise<void>
  loadWorld: () => Promise<void>
  clearError: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  homeCards: [],
  galleryCards: [],
  currentCard: null,
  currentBattle: null,
  worldData: null,
  loading: null,
  error: null,
  clearError: () => set({ error: null }),
  loadHomeCards: async () => {
    set({ loading: "home", error: null })
    try {
      const homeCards = await fetchCards({ limit: 3 })
      set({ homeCards, loading: null })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "加载首页失败", loading: null })
    }
  },
  loadGalleryCards: async () => {
    set({ loading: "gallery", error: null })
    try {
      const galleryCards = await fetchCards({ limit: 50 })
      set({ galleryCards, loading: null })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "加载图鉴失败", loading: null })
    }
  },
  loadCard: async (id: string) => {
    set({ loading: `card:${id}`, error: null })
    try {
      const currentCard = await fetchCard(id)
      set({ currentCard, loading: null })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "加载卡牌失败", loading: null })
    }
  },
  loadBattle: async (id: string) => {
    set({ loading: `battle:${id}`, error: null })
    try {
      const currentBattle = await fetchBattle(id)
      set({ currentBattle, loading: null })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "加载战报失败", loading: null })
    }
  },
  loadWorld: async () => {
    set({ loading: "world", error: null })
    try {
      const worldData = await fetchWorld()
      set({ worldData, loading: null })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "加载小世界失败", loading: null })
    }
  },
}))
