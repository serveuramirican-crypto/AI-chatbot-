import { Sidebar } from "@/components/layout/Sidebar"

// Canvas Flow uses a full-screen layout without the standard padding container
export default function CanvasFlowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0e14]">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
