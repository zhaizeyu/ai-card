export function BattleLog({ log }: { log: string[] }) {
  return (
    <ol className="space-y-2">
      {log.map((line, index) => (
        <li key={`${line}-${index}`} className="rounded-md border border-ink/10 bg-white p-3 text-sm leading-6 text-ink/75">
          {line}
        </li>
      ))}
    </ol>
  )
}
