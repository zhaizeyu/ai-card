import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/src/components/layout/AppShell"
import BattlePage from "@/src/pages/BattlePage"
import BattleResultPage from "@/src/pages/BattleResultPage"
import CardDetailPage from "@/src/pages/CardDetailPage"
import ComponentsPage from "@/src/pages/ComponentsPage"
import CreatePage from "@/src/pages/CreatePage"
import GalleryPage from "@/src/pages/GalleryPage"
import HomePage from "@/src/pages/HomePage"
import NotFoundPage from "@/src/pages/NotFoundPage"
import WorldPage from "@/src/pages/WorldPage"

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/components" element={<ComponentsPage />} />
        <Route path="/world" element={<WorldPage />} />
        <Route path="/cards/:id" element={<CardDetailPage />} />
        <Route path="/battle/:id" element={<BattlePage />} />
        <Route path="/battles/:id" element={<BattleResultPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </AppShell>
  )
}
