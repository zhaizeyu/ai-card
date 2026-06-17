import { Link, NavLink } from "react-router-dom"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/create", label: "生成" },
  { to: "/gallery", label: "图鉴" },
  { to: "/components", label: "组件" },
  { to: "/world", label: "小世界" },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-ink/10 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-black tracking-wide">
            AI Monster Cards
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold text-ink/70">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn("transition hover:text-ink", isActive && "text-ink")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      {children}
    </>
  )
}
