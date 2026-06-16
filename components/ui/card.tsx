import * as React from "react"
import { cn } from "@/lib/utils"

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-ink/10 bg-white shadow-card", className)} {...props} />
}
