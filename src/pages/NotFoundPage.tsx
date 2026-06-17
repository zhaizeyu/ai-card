import { Link } from "react-router-dom"

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-4xl font-black">页面不存在</h1>
      <p className="mt-4 text-ink/70">请求的路由没有对应页面。</p>
      <Link className="mt-8 inline-flex h-10 items-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold" to="/">
        返回首页
      </Link>
    </main>
  )
}
