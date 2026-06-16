import { prisma } from "@/lib/db"
import { generateCardCopy } from "@/lib/ai"
import { pickPassiveComponent, pickUpgradeComponent } from "@/lib/card/components"
import { promptSchema } from "@/lib/validators"
import { generateStats } from "./card-balance"
import { rollGrowthType } from "./card-progression"
import { rollElement } from "./element"
import { rollRarity } from "./rarity"
import { generateSkill } from "./skill-generator"

export async function createMonsterCard(prompt: string) {
  const { prompt: safePrompt } = promptSchema.parse({ prompt })
  const rarity = rollRarity()
  const element = rollElement()
  const stats = generateStats(rarity)
  const fallbackSkill = generateSkill(rarity, safePrompt)

  try {
    const { copy, skillProposal, rawOutput, source } = await generateCardCopy({
      prompt: safePrompt,
      rarity,
      element,
      skill: fallbackSkill,
    })
    const skill = source === "fallback" ? fallbackSkill : generateSkill(rarity, safePrompt, skillProposal)
    const growthType = rollGrowthType(safePrompt, skill.effect)
    const componentSeed = { prompt: safePrompt, growthType, effect: skill.effect, cooldown: skill.cooldown }

    const card = await prisma.card.create({
      data: {
        prompt: safePrompt,
        name: copy.name,
        race: copy.race,
        element,
        rarity,
        growthType,
        ...stats,
        skillName: copy.skillName,
        skillText: copy.skillText,
        skillType: skill.skillType,
        passiveComponent: pickPassiveComponent(componentSeed),
        upgradeComponent: pickUpgradeComponent(componentSeed),
        trigger: skill.trigger,
        condition: skill.condition,
        selector: skill.selector,
        effect: skill.effect,
        effectPower: skill.effectPower,
        cooldown: skill.cooldown,
        description: copy.description,
      },
    })

    await prisma.generationLog.create({
      data: {
        prompt: safePrompt,
        rawOutput,
        status: source === "ai" ? "success" : "fallback",
      },
    })

    return card
  } catch (error) {
    await prisma.generationLog.create({
      data: {
        prompt: safePrompt,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown AI error",
      },
    })
    throw error
  }
}
