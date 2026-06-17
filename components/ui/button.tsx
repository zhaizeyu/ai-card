import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost"
  asChild?: boolean
}

export function Button({ className, variant = "primary", asChild = false, children, ...props }: ButtonProps) {
  const classes = cn(
    "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-ink text-white hover:bg-black",
    variant === "secondary" && "border border-ink/15 bg-white text-ink hover:bg-ink/5",
    variant === "ghost" && "text-ink hover:bg-ink/5",
    className,
  )

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      className={classes}
      {...props}
    >
      {children}
    </button>
  )
}
