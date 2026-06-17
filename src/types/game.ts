import type { Battle, Card } from "@prisma/client"

export type CardSummary = Card

export type TeamSnapshot = {
  cardId: string
  name: string
  position: number
  hp: number
  maxHp: number
  alive: boolean
}

export type BattleReward = {
  exp: number
  component?: { name: string } | null
  levelsGained?: number
  level?: number
  unlocked?: string[]
  title?: string | null
  bondGained?: number
  teamBond?: Array<{ cardId: string; bond: number }>
  team?: Array<{
    cardId: string
    exp: number
    levelsGained: number
    level: number
    unlocked: string[]
    title?: string | null
  }>
}

export type BattleDetail = Omit<Battle, "battleLog" | "rewardJson" | "playerTeamJson" | "enemyTeamJson"> & {
  playerCard: Card
  enemyCard: Card | null
  battleLog: string[]
  rewardJson: BattleReward | null
  playerTeamJson: TeamSnapshot[] | null
  enemyTeamJson: TeamSnapshot[] | null
}

export type WorldPageData = {
  world: {
    id: string
    name: string
    theme: string
    description: string | null
    day: number
    prosperity: number
    safety: number
    resource: number
    chaos: number
    fame: number
  }
  cards: Array<
    Pick<
      Card,
      | "id"
      | "name"
      | "element"
      | "rarity"
      | "level"
      | "exp"
      | "hp"
      | "atk"
      | "def"
      | "spd"
      | "powerScore"
      | "upgradeUnlocked"
      | "upgradeComponent"
      | "wins"
      | "losses"
    >
  >
  team: Array<{
    role: "team_1" | "team_2" | "team_3"
    bond: number
    card: Pick<
      Card,
      | "id"
      | "name"
      | "element"
      | "rarity"
      | "level"
      | "exp"
      | "hp"
      | "atk"
      | "def"
      | "spd"
      | "powerScore"
      | "upgradeUnlocked"
      | "upgradeComponent"
      | "wins"
      | "losses"
    >
  }>
  pendingEvent: {
    id: string
    day: number
    type: string
    title: string
    description: string
    difficulty: number
    status: string
    result: string | null
  } | null
  recentEvents: Array<{
    id: string
    day: number
    type: string
    title: string
    description: string
    difficulty: number
    status: string
    result: string | null
  }>
  inventory: Array<{
    id: string
    name: string
    rarity: string
    description: string
    effect: string
    cost: number
    equippedCardId: string | null
  }>
}
