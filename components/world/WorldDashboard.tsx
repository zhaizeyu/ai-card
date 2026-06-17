"use client"

import { Boxes, CalendarDays, CheckCircle2, Flame, HeartHandshake, Shield, Swords, Trophy, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Panel } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CardSummary = {
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
}

type WorldState = {
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

type TeamAssignment = {
  role: "team_1" | "team_2" | "team_3"
  bond: number
  card: CardSummary
}

type EventState = {
  id: string
  day: number
  type: string
  title: string
  description: string
  difficulty: number
  status: string
  result: string | null
}

type InventoryItem = {
  id: string
  name: string
  rarity: string
  description: string
  effect: string
  cost: number
  equippedCardId: string | null
}

type Props = {
  world: WorldState
  cards: CardSummary[]
  team: TeamAssignment[]
  pendingEvent: EventState | null
  recentEvents: EventState[]
  inventory: InventoryItem[]
}

const roles = [
  { id: "team_1", label: "一号位" },
  { id: "team_2", label: "二号位" },
  { id: "team_3", label: "三号位" },
] as const

export function WorldDashboard({ world, cards, team, pendingEvent, recentEvents, inventory }: Props) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState("")
  const [error, setError] = useState("")
  const [selectedComponent, setSelectedComponent] = useState(inventory.find((item) => !item.equippedCardId)?.id ?? "")
  const [selectedEquipCard, setSelectedEquipCard] = useState(cards.find((card) => card.upgradeUnlocked)?.id ?? "")

  const teamByRole = useMemo(() => {
    return Object.fromEntries(team.map((item) => [item.role, item.card])) as Partial<Record<(typeof roles)[number]["id"], CardSummary>>
  }, [team])
  const teamCards = roles.map((role) => teamByRole[role.id]).filter((card): card is CardSummary => Boolean(card))
  const teamPower = teamCards.reduce((sum, card) => sum + card.powerScore, 0)
  const averageBond = team.length ? Math.round(team.reduce((sum, item) => sum + item.bond, 0) / team.length) : 0
  const bondBonus = team.length === 3 ? Math.min(18, Math.floor(averageBond / 10) * 2) : 0
  const finale = buildFinaleProgress(world, teamCards, averageBond)
  const tasks = buildTasks(world, teamCards, inventory, pendingEvent, averageBond)

  async function postWorldAction(body: Record<string, unknown>, loadingLabel: string) {
    setLoading(loadingLabel)
    setError("")
    const response = await fetch("/api/world", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await response.json()) as { error?: string; battleId?: string }
    setLoading("")

    if (!response.ok) {
      setError(data.error ?? "操作失败")
      return null
    }

    return data
  }

  async function assignTeam(role: (typeof roles)[number]["id"], cardId: string) {
    if (!cardId) return
    const data = await postWorldAction({ action: "assign_team", worldId: world.id, role, cardId }, `assign-${role}`)
    if (data) window.location.reload()
  }

  async function advanceDay() {
    const data = await postWorldAction({ action: "advance_day", worldId: world.id }, "advance")
    if (data) window.location.reload()
  }

  async function trainBond() {
    const data = await postWorldAction({ action: "train_bond", worldId: world.id }, "train-bond")
    if (data) window.location.reload()
  }

  async function resolveEvent(approach: "fight" | "caution" | "negotiate") {
    if (!pendingEvent) return
    const data = await postWorldAction({ action: "resolve_event", eventId: pendingEvent.id, approach }, `resolve-${approach}`)
    if (!data) return
    if (data.battleId) navigate(`/battles/${data.battleId}`)
    else window.location.reload()
  }

  async function equipSelectedComponent() {
    if (!selectedComponent || !selectedEquipCard) return
    const data = await postWorldAction(
      { action: "equip_component", componentId: selectedComponent, cardId: selectedEquipCard },
      "equip",
    )
    if (data) window.location.reload()
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink/50">第 {world.day} 天 · {world.theme}</p>
          <h1 className="mt-2 text-4xl font-black">{world.name}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-ink/70">{world.description}</p>
        </div>
        <Button onClick={advanceDay} disabled={Boolean(pendingEvent) || loading === "advance"} className="gap-2">
          <CalendarDays className="h-4 w-4" />
          {loading === "advance" ? "推进中" : "推进一天"}
        </Button>
      </div>

      <Panel className="mt-8 overflow-hidden p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink/50">
              <Trophy className="h-4 w-4" />
              终局目标
            </p>
            <h2 className="mt-2 text-2xl font-black">封印混沌裂隙，建立稳定聚落</h2>
            <p className="mt-2 max-w-2xl leading-7 text-ink/70">
              把声望推到 40、混沌压到 10，并培养一支平均羁绊 40 的主力队伍。达成后这个小世界就从临时据点变成完成态。
            </p>
          </div>
          <div className="min-w-[220px] rounded-md border border-ink/10 bg-ink/[0.03] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">完成度</span>
              <span className="font-black">{finale.progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-ember" style={{ width: `${finale.progress}%` }} />
            </div>
            <p className="mt-3 text-xs font-semibold text-ink/55">{finale.status}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {finale.goals.map((goal) => (
            <GoalPill key={goal.label} label={goal.label} value={goal.value} done={goal.done} />
          ))}
        </div>
      </Panel>

      <section className="mt-8 grid gap-4 md:grid-cols-5">
        <WorldStat label="繁荣" value={world.prosperity} tone="bg-moss" />
        <WorldStat label="安全" value={world.safety} tone="bg-tide" />
        <WorldStat label="资源" value={world.resource} tone="bg-ember" />
        <WorldStat label="混沌" value={world.chaos} tone="bg-ink" />
        <WorldStat label="声望" value={world.fame} tone="bg-moss" />
      </section>

      {error ? <p className="mt-4 rounded-md border border-ember/30 bg-ember/10 p-3 text-sm font-semibold text-ember">{error}</p> : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink/50">当前事件</p>
                <h2 className="mt-1 text-2xl font-black">{pendingEvent ? pendingEvent.title : "今日平静"}</h2>
              </div>
              {pendingEvent ? (
                <span className="rounded bg-ink/[0.06] px-3 py-1 text-sm font-bold text-ink/60">难度 {pendingEvent.difficulty}</span>
              ) : null}
            </div>
            <p className="mt-4 leading-7 text-ink/70">
              {pendingEvent ? pendingEvent.description : "没有待处理事件。推进一天会触发新的探索、建设或危机。"}
            </p>
            {pendingEvent ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => resolveEvent("fight")} disabled={teamCards.length !== 3 || loading === "resolve-fight"} className="gap-2">
                  <Swords className="h-4 w-4" />
                  {loading === "resolve-fight" ? "结算中" : "派队迎战"}
                </Button>
                <Button variant="secondary" onClick={() => resolveEvent("caution")} disabled={loading === "resolve-caution"} className="gap-2">
                  <Shield className="h-4 w-4" />
                  稳妥处理
                </Button>
                <Button variant="secondary" onClick={() => resolveEvent("negotiate")} disabled={loading === "resolve-negotiate"} className="gap-2">
                  <Users className="h-4 w-4" />
                  协商处理
                </Button>
              </div>
            ) : null}
            {pendingEvent ? (
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <ApproachNote label="迎战" text={`最高经验与组件概率，羁绊参与战斗加成${bondBonus ? ` +${bondBonus}%` : ""}。`} />
                <ApproachNote label="稳妥" text="消耗世界状态做检定，成功收益减半，失败损失较小。" />
                <ApproachNote label="协商" text="依赖繁荣与声望，适合把聚落经营成外交路线。" />
              </div>
            ) : null}
          </Panel>

          <Panel className="p-5">
            <h2 className="text-xl font-black">事件记录</h2>
            <div className="mt-4 space-y-3">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-4 rounded-md border border-ink/10 bg-ink/[0.03] p-3">
                  <div>
                    <p className="text-sm font-bold">{event.title}</p>
                    <p className="mt-1 text-xs text-ink/55">第 {event.day} 天 · 难度 {event.difficulty}</p>
                  </div>
                  <span className="text-sm font-semibold text-ink/60">{formatEventResult(event)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">主力队伍</h2>
              <span className="rounded bg-ink/[0.06] px-2 py-1 text-xs font-bold text-ink/60">战力 {teamPower}</span>
            </div>
            <div className="mt-3 rounded-md border border-ink/10 bg-ink/[0.03] p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-bold">
                  <HeartHandshake className="h-4 w-4" />
                  队伍羁绊
                </span>
                <span className="font-black">{averageBond}/100</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-tide" style={{ width: `${Math.min(100, averageBond)}%` }} />
              </div>
              <p className="mt-2 text-xs text-ink/55">事件战斗加成：生命与攻击 +{bondBonus}%</p>
              <Button
                variant="secondary"
                onClick={trainBond}
                disabled={teamCards.length !== 3 || world.resource < 4 || loading === "train-bond"}
                className="mt-3 w-full gap-2"
              >
                <Flame className="h-4 w-4" />
                {loading === "train-bond" ? "训练中" : "共鸣训练 · 资源 -4"}
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {roles.map((role) => {
                const card = teamByRole[role.id]
                const assignment = team.find((item) => item.role === role.id)
                return (
                  <div key={role.id} className="rounded-md border border-ink/10 bg-ink/[0.03] p-3">
                    <label className="text-xs font-bold text-ink/50">{role.label}</label>
                    <select
                      className="mt-2 h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold"
                      value={card?.id ?? ""}
                      onChange={(event) => assignTeam(role.id, event.target.value)}
                      disabled={loading === `assign-${role.id}`}
                    >
                      <option value="">选择卡牌</option>
                      {cards.map((item) => (
                        <option key={item.id} value={item.id}>
                          Lv.{item.level} {item.name} · {item.powerScore}
                        </option>
                      ))}
                    </select>
                    {card ? (
                      <p className="mt-2 text-xs text-ink/55">
                        {card.element} · {card.rarity} · 羁绊 {assignment?.bond ?? 0} · 胜负 {card.wins}/{card.losses}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <CheckCircle2 className="h-5 w-5" />
              当前目标
            </h2>
            <div className="mt-4 space-y-2">
              {tasks.map((task) => (
                <div key={task.label} className="flex items-center gap-3 text-sm">
                  <span className={cn("h-2.5 w-2.5 rounded-full", task.done ? "bg-moss" : "bg-ink/20")} />
                  <span className={task.done ? "text-ink/45 line-through" : "text-ink/70"}>{task.label}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Boxes className="h-5 w-5" />
              组件背包
            </h2>
            {inventory.length ? (
              <div className="mt-4 space-y-3">
                <select
                  className="h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold"
                  value={selectedComponent}
                  onChange={(event) => setSelectedComponent(event.target.value)}
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.equippedCardId ? " · 已装配" : ""}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 w-full rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold"
                  value={selectedEquipCard}
                  onChange={(event) => setSelectedEquipCard(event.target.value)}
                >
                  <option value="">选择 Lv.7 卡牌</option>
                  {cards.filter((card) => card.upgradeUnlocked).map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} · 当前 {card.upgradeComponent ?? "无"}
                    </option>
                  ))}
                </select>
                <Button onClick={equipSelectedComponent} disabled={!selectedComponent || !selectedEquipCard || loading === "equip"} className="w-full">
                  {loading === "equip" ? "装配中" : "装配到强化槽"}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink/65">事件战斗胜利后有概率掉落组件。</p>
            )}
          </Panel>
        </aside>
      </section>
    </main>
  )
}

function GoalPill({ label, value, done }: { label: string; value: string; done: boolean }) {
  return (
    <div className={cn("rounded-md border p-3", done ? "border-moss/25 bg-moss/10" : "border-ink/10 bg-ink/[0.03]")}>
      <p className="text-xs font-bold text-ink/50">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  )
}

function ApproachNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-ink/[0.03] p-3">
      <p className="font-bold">{label}</p>
      <p className="mt-1 leading-6 text-ink/60">{text}</p>
    </div>
  )
}

function WorldStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span className="font-black">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </Panel>
  )
}

function buildFinaleProgress(world: WorldState, teamCards: CardSummary[], averageBond: number) {
  const goals = [
    { label: "声望", value: `${Math.min(world.fame, 40)}/40`, done: world.fame >= 40, score: Math.min(world.fame / 40, 1) },
    { label: "混沌", value: `${world.chaos}/10 以下`, done: world.chaos <= 10, score: world.chaos <= 10 ? 1 : Math.max(0, (60 - world.chaos) / 50) },
    { label: "主力", value: `${teamCards.length}/3`, done: teamCards.length === 3, score: teamCards.length / 3 },
    { label: "羁绊", value: `${Math.min(averageBond, 40)}/40`, done: averageBond >= 40, score: Math.min(averageBond / 40, 1) },
  ]
  const progress = Math.round((goals.reduce((sum, goal) => sum + goal.score, 0) / goals.length) * 100)
  const status = goals.every((goal) => goal.done) ? "完成态：世界已经稳定" : "继续处理事件、训练队伍并控制混沌"

  return { goals, progress, status }
}

function buildTasks(
  world: WorldState,
  teamCards: CardSummary[],
  inventory: InventoryItem[],
  pendingEvent: EventState | null,
  averageBond: number,
) {
  return [
    { label: "配置 3 张主力卡", done: teamCards.length === 3 },
    { label: "处理今日事件", done: !pendingEvent },
    { label: "任意主力达到 Lv.5", done: teamCards.some((card) => card.level >= 5) },
    { label: "主力平均羁绊达到 20", done: averageBond >= 20 },
    { label: "获得并装配 1 个组件", done: inventory.some((item) => item.equippedCardId) },
    { label: "世界声望达到 40", done: world.fame >= 40 },
  ]
}

function formatEventResult(event: EventState) {
  if (event.status === "pending") return "待处理"
  if (event.result === "win" || event.result === "success") return "成功"
  if (event.result === "draw") return "部分成功"
  if (event.result === "loss" || event.result === "failed") return "失败"
  return "已完成"
}
