import { z } from "zod"

export const promptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(2, "请至少输入 2 个字符")
    .max(180, "描述请控制在 180 个字符以内"),
})

export const battleRequestSchema = z.object({
  cardId: z.string().min(1),
  opponentCardId: z.string().min(1).optional(),
  cardIds: z.array(z.string().min(1)).min(1).max(3).optional(),
  opponentCardIds: z.array(z.string().min(1)).min(1).max(3).optional(),
}).refine((data) => data.cardId !== data.opponentCardId, {
  message: "请选择两张不同的卡牌",
  path: ["opponentCardId"],
}).refine((data) => {
  if (!data.cardIds?.length) return true
  return new Set(data.cardIds).size === data.cardIds.length
}, {
  message: "队伍中不能选择重复卡牌",
  path: ["cardIds"],
}).refine((data) => {
  if (!data.cardIds?.length || !data.opponentCardIds?.length) return true
  const playerIds = new Set(data.cardIds)
  return data.opponentCardIds.every((id) => !playerIds.has(id))
}, {
  message: "敌我队伍不能使用同一张卡牌",
  path: ["opponentCardIds"],
})

export const cardListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  rarity: z.string().optional(),
  element: z.string().optional(),
})
