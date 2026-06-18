import fs from "node:fs"
import { PrismaClient } from "@prisma/client"

const exportPath = process.argv[2] ?? "/tmp/ai-card-sqlite-export.json"
const data = JSON.parse(fs.readFileSync(exportPath, "utf8"))
const prisma = new PrismaClient()

const models = [
  ["Card", prisma.card],
  ["GenerationLog", prisma.generationLog],
  ["ComponentReward", prisma.componentReward],
  ["World", prisma.world],
  ["WorldLocation", prisma.worldLocation],
  ["WorldCard", prisma.worldCard],
  ["WorldEvent", prisma.worldEvent],
  ["Battle", prisma.battle],
]

async function upsertRows(name, model) {
  const rows = data[name] ?? []

  for (const row of rows) {
    await model.upsert({
      where: { id: row.id },
      update: row,
      create: row,
    })
  }

  return rows.length
}

try {
  const counts = {}

  for (const [name, model] of models) {
    counts[name] = await upsertRows(name, model)
  }

  console.log(JSON.stringify(counts, null, 2))
} finally {
  await prisma.$disconnect()
}
