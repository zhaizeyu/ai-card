import express from "express"
import { createServer as createViteServer } from "vite"
import { promises as fs } from "node:fs"
import path from "node:path"
import {
  advanceWorldDay,
  assignTeamCard,
  equipComponent,
  getOrCreateWorld,
  resolveWorldEvent,
  teamRoles,
  trainTeamBond,
} from "@/lib/world/world-game"
import { createMonsterCard } from "@/lib/card/card-generator"
import { prisma } from "@/lib/db"
import { battleRequestSchema, cardListQuerySchema, worldActionSchema } from "@/lib/validators"
import { buildBattleReward } from "@/lib/battle/rewards"
import { applyCardProgression } from "@/lib/card/card-progression"
import { pickPassiveComponent, pickUpgradeComponent } from "@/lib/card/components"
import { runBattle } from "@/lib/battle/battle-engine"
import { runTeamBattle } from "@/lib/battle/team-battle-engine"

const isProduction = process.env.NODE_ENV === "production"
const port = Number(process.env.PORT ?? 3002)

async function main() {
  const app = express()
  app.use(express.json({ limit: "1mb" }))

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true })
  })

  app.get("/api/cards", async (req, res) => {
    try {
      const query = cardListQuerySchema.parse({
        limit: req.query.limit,
        rarity: req.query.rarity,
        element: req.query.element,
      })

      const cards = await prisma.card.findMany({
        where: {
          rarity: query.rarity,
          element: query.element,
        },
        orderBy: { createdAt: "desc" },
        take: query.limit,
      })

      res.json({ cards })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "获取卡牌失败" })
    }
  })

  app.get("/api/cards/:id", async (req, res) => {
    const card = await prisma.card.findUnique({ where: { id: req.params.id } })
    if (!card) {
      res.status(404).json({ error: "Card not found" })
      return
    }
    res.json({ card })
  })

  app.post("/api/generate-card", async (req, res) => {
    try {
      const { prompt } = req.body as { prompt?: string }
      if (!prompt?.trim()) {
        throw new Error("请至少输入 2 个字符")
      }
      const card = await createMonsterCard(prompt)
      res.json({ cardId: card.id })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "生成卡牌失败" })
    }
  })

  app.post("/api/battle", async (req, res) => {
    try {
      const { cardId, opponentCardId, cardIds, opponentCardIds } = battleRequestSchema.parse(req.body)

      if (cardIds?.length) {
        const playerCards = await prisma.card.findMany({ where: { id: { in: cardIds } } })
        const orderedPlayerCards = cardIds
          .map((id) => playerCards.find((card) => card.id === id))
          .filter((card): card is (typeof playerCards)[number] => Boolean(card))

        if (orderedPlayerCards.length !== cardIds.length) {
          res.status(404).json({ error: "Team card not found" })
          return
        }

        const enemyCards = opponentCardIds?.length
          ? await prisma.card.findMany({ where: { id: { in: opponentCardIds } } })
          : await Promise.all(
              orderedPlayerCards.map(() =>
                createMonsterCard("随机敌人", { useAi: false }),
              ),
            )
        const orderedEnemyCards = opponentCardIds?.length
          ? opponentCardIds
              .map((id) => enemyCards.find((card) => card.id === id))
              .filter((card): card is (typeof enemyCards)[number] => Boolean(card))
          : enemyCards

        if (!orderedEnemyCards.length || (opponentCardIds?.length && orderedEnemyCards.length !== opponentCardIds.length)) {
          res.status(404).json({ error: "Opponent team card not found" })
          return
        }

        const isSimulation = Boolean(opponentCardIds?.length)
        const outcome = runTeamBattle(orderedPlayerCards, orderedEnemyCards)
        const reward = isSimulation
          ? { exp: 0, component: null, team: [] }
          : {
              exp: outcome.result === "win" ? 8 : outcome.result === "draw" ? 4 : 3,
              component: buildBattleReward(outcome.result === "win" ? orderedPlayerCards[0] : orderedEnemyCards[0], outcome.result).component,
              team: [] as Array<{
                cardId: string
                exp: number
                levelsGained: number
                level: number
                unlocked: string[]
                title?: string | null
              }>,
            }

        if (!isSimulation) {
          for (const card of orderedPlayerCards) {
            const progression = applyCardProgression(card, outcome.result, reward.exp)
            reward.team.push({
              cardId: card.id,
              exp: reward.exp,
              levelsGained: progression.levelsGained,
              level: progression.level,
              unlocked: progression.unlocked,
              title: progression.title,
            })
            await prisma.card.update({
              where: { id: card.id },
              data: {
                exp: progression.exp,
                level: progression.level,
                hp: progression.hp,
                atk: progression.atk,
                def: progression.def,
                spd: progression.spd,
                powerScore: progression.hp + progression.atk * 4 + progression.def * 3 + progression.spd * 3,
                effectPower: progression.effectPower,
                cooldown: progression.cooldown,
                title: progression.title,
                passiveUnlocked: progression.passiveUnlocked,
                upgradeUnlocked: progression.upgradeUnlocked,
                passiveComponent: card.passiveComponent ?? pickPassiveComponent(card),
                upgradeComponent: card.upgradeComponent ?? pickUpgradeComponent(card),
                wins: outcome.result === "win" ? { increment: 1 } : undefined,
                losses: outcome.result === "loss" ? { increment: 1 } : undefined,
              },
            })
          }
        }

        const battle = await prisma.battle.create({
          data: {
            playerCardId: orderedPlayerCards[0].id,
            enemyCardId: orderedEnemyCards[0].id,
            mode: "team",
            result: outcome.result,
            winnerCardId: outcome.winnerCardId,
            loserCardId: outcome.loserCardId,
            playerTeamJson: JSON.stringify(outcome.playerTeam),
            enemyTeamJson: JSON.stringify(outcome.enemyTeam),
            battleLog: JSON.stringify(outcome.log),
            rewardJson: JSON.stringify(reward),
          },
        })

        if (reward.component && outcome.result === "win" && !isSimulation) {
          await prisma.componentReward.create({ data: reward.component })
        }

        res.json({
          battleId: battle.id,
          result: outcome.result,
          log: outcome.log,
          reward,
        })
        return
      }

      const playerCard = await prisma.card.findUnique({ where: { id: cardId } })

      if (!playerCard) {
        res.status(404).json({ error: "Card not found" })
        return
      }

      const enemyCard = opponentCardId
        ? await prisma.card.findUnique({ where: { id: opponentCardId } })
        : await createMonsterCard("随机敌人", { useAi: false })

      if (!enemyCard) {
        res.status(404).json({ error: "Opponent card not found" })
        return
      }

      const isSimulation = Boolean(opponentCardId)
      const outcome = runBattle(playerCard, enemyCard)
      const playerResult = outcome.result
      const reward = isSimulation
        ? { exp: 0, component: null }
        : buildBattleReward(playerResult === "win" ? playerCard : enemyCard, playerResult)
      const progression = !isSimulation ? applyCardProgression(playerCard, playerResult) : null
      const rewardPayload = progression
        ? {
            ...reward,
            levelsGained: progression.levelsGained,
            level: progression.level,
            unlocked: progression.unlocked,
            title: progression.title,
          }
        : reward

      const battle = await prisma.battle.create({
        data: {
          playerCardId: playerCard.id,
          enemyCardId: enemyCard.id,
          result: playerResult,
          winnerCardId: outcome.winnerCardId,
          loserCardId: outcome.loserCardId,
          battleLog: JSON.stringify(outcome.log),
          rewardJson: JSON.stringify(rewardPayload),
        },
      })

      if (progression) {
        await prisma.card.update({
          where: { id: playerCard.id },
          data: {
            exp: progression.exp,
            level: progression.level,
            hp: progression.hp,
            atk: progression.atk,
            def: progression.def,
            spd: progression.spd,
            powerScore: progression.hp + progression.atk * 4 + progression.def * 3 + progression.spd * 3,
            effectPower: progression.effectPower,
            cooldown: progression.cooldown,
            title: progression.title,
            passiveUnlocked: progression.passiveUnlocked,
            upgradeUnlocked: progression.upgradeUnlocked,
            passiveComponent: playerCard.passiveComponent ?? pickPassiveComponent(playerCard),
            upgradeComponent: playerCard.upgradeComponent ?? pickUpgradeComponent(playerCard),
            wins: playerResult === "win" ? { increment: 1 } : undefined,
            losses: playerResult === "loss" ? { increment: 1 } : undefined,
          },
        })
      }

      if (reward.component && playerResult === "win" && !isSimulation) {
        await prisma.componentReward.create({ data: reward.component })
      }

      res.json({
        battleId: battle.id,
        result: playerResult,
        log: outcome.log,
        reward: rewardPayload,
      })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "战斗失败" })
    }
  })

  app.get("/api/battles/:id", async (req, res) => {
    const battle = await prisma.battle.findUnique({
      where: { id: req.params.id },
      include: {
        playerCard: true,
        enemyCard: true,
      },
    })

    if (!battle) {
      res.status(404).json({ error: "Battle not found" })
      return
    }

    res.json({
      battle: {
        ...battle,
        battleLog: JSON.parse(battle.battleLog) as string[],
        rewardJson: battle.rewardJson ? JSON.parse(battle.rewardJson) : null,
        playerTeamJson: battle.playerTeamJson ? JSON.parse(battle.playerTeamJson) : null,
        enemyTeamJson: battle.enemyTeamJson ? JSON.parse(battle.enemyTeamJson) : null,
      },
    })
  })

  app.get("/api/world", async (_req, res) => {
    try {
      const data = await buildWorldPageData()
      res.json(data)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "小世界加载失败" })
    }
  })

  app.post("/api/world", async (req, res) => {
    try {
      const payload = worldActionSchema.parse(req.body)

      if (payload.action === "create") {
        const world = await getOrCreateWorld()
        res.json({ worldId: world.id })
        return
      }

      if (payload.action === "assign_team") {
        await assignTeamCard(payload.worldId, payload.role, payload.cardId)
        res.json({ ok: true })
        return
      }

      if (payload.action === "advance_day") {
        await advanceWorldDay(payload.worldId)
        res.json({ ok: true })
        return
      }

      if (payload.action === "train_bond") {
        await trainTeamBond(payload.worldId)
        res.json({ ok: true })
        return
      }

      if (payload.action === "resolve_event") {
        const result = await resolveWorldEvent(payload.eventId, payload.approach)
        res.json(result)
        return
      }

      if (payload.action === "equip_component") {
        await equipComponent(payload.componentId, payload.cardId)
        res.json({ ok: true })
        return
      }

      res.status(400).json({ error: "未知操作" })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "小世界操作失败" })
    }
  })

  if (isProduction) {
    const distDir = path.resolve(process.cwd(), "dist")
    app.use(express.static(distDir))
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, "index.html"))
    })
  } else {
    const vite = await createViteServer({
      appType: "spa",
      server: { middlewareMode: true },
    })

    app.use(vite.middlewares)
    app.use(async (req, res, next) => {
      try {
        let html = await fs.readFile(path.resolve(process.cwd(), "index.html"), "utf-8")
        html = await vite.transformIndexHtml(req.originalUrl, html)
        res.status(200).set({ "Content-Type": "text/html" }).end(html)
      } catch (error) {
        vite.ssrFixStacktrace(error as Error)
        next(error)
      }
    })
  }

  app.listen(port, process.env.HOST ?? "0.0.0.0", () => {
    console.log(`Server running on http://${process.env.HOST ?? "0.0.0.0"}:${port}`)
  })
}

async function buildWorldPageData() {
  const world = await getOrCreateWorld()
  const [worldCards, cards, events, inventory] = await Promise.all([
    prisma.worldCard.findMany({
      where: { worldId: world.id, role: { in: [...teamRoles] } },
      include: { card: true },
    }),
    prisma.card.findMany({ orderBy: [{ level: "desc" }, { createdAt: "desc" }], take: 80 }),
    prisma.worldEvent.findMany({ where: { worldId: world.id }, orderBy: [{ day: "desc" }, { createdAt: "desc" }], take: 8 }),
    prisma.componentReward.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ])

  const pendingEvent = events.find((event) => event.status === "pending") ?? null

  return {
    world: {
      id: world.id,
      name: world.name,
      theme: world.theme,
      description: world.description,
      day: world.day,
      prosperity: world.prosperity,
      safety: world.safety,
      resource: world.resource,
      chaos: world.chaos,
      fame: world.fame,
    },
    cards: cards.map(toCardSummary),
    team: worldCards.map((item) => ({
      role: item.role as "team_1" | "team_2" | "team_3",
      bond: item.bond,
      card: toCardSummary(item.card),
    })),
    pendingEvent: pendingEvent ? toEventState(pendingEvent) : null,
    recentEvents: events.map(toEventState),
    inventory: inventory.map((item) => ({
      id: item.id,
      name: item.name,
      rarity: item.rarity,
      description: item.description,
      effect: item.effect,
      cost: item.cost,
      equippedCardId: item.equippedCardId,
    })),
  }
}

function toCardSummary(card: {
  id: string
  name: string
  element: string
  rarity: string
  level: number
  exp: number
  hp: number
  atk: number
  def: number
  spd: number
  powerScore: number
  upgradeUnlocked: boolean
  upgradeComponent: string | null
  wins: number
  losses: number
}) {
  return {
    id: card.id,
    name: card.name,
    element: card.element,
    rarity: card.rarity,
    level: card.level,
    exp: card.exp,
    hp: card.hp,
    atk: card.atk,
    def: card.def,
    spd: card.spd,
    powerScore: card.powerScore,
    upgradeUnlocked: card.upgradeUnlocked,
    upgradeComponent: card.upgradeComponent,
    wins: card.wins,
    losses: card.losses,
  }
}

function toEventState(event: {
  id: string
  day: number
  type: string
  title: string
  description: string
  difficulty: number
  status: string
  result: string | null
}) {
  return {
    id: event.id,
    day: event.day,
    type: event.type,
    title: event.title,
    description: event.description,
    difficulty: event.difficulty,
    status: event.status,
    result: event.result,
  }
}

void main()
