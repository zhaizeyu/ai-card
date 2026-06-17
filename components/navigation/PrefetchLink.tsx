"use client"

import Link, { type LinkProps } from "next/link"
import { useRouter } from "next/navigation"
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react"

type PrefetchLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href"> & {
    children: ReactNode
  }

export function PrefetchLink({ href, onFocus, onMouseEnter, onPointerDown, children, ...props }: PrefetchLinkProps) {
  const router = useRouter()

  function prefetch() {
    if (typeof href === "string") {
      router.prefetch(href)
    }
  }

  return (
    <Link
      href={href}
      prefetch
      onFocus={(event) => {
        prefetch()
        onFocus?.(event)
      }}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        prefetch()
        onMouseEnter?.(event)
      }}
      onPointerDown={(event) => {
        prefetch()
        onPointerDown?.(event)
      }}
      {...props}
    >
      {children}
    </Link>
  )
}
