import PlaybookLibrary from "@/components/playbook/PlaybookLibrary"

export const metadata = {
  title: "Playbooks — AI Chatbot",
  description: "Manage your agentic playbooks and hand-off configurations.",
}

/**
 * /playbooks — full-screen Playbook library + editor.
 * The layout is handled entirely inside PlaybookLibrary so this page
 * intentionally bypasses the max-w-7xl container from DashboardLayout
 * by rendering the component inside a full-height, overflow-hidden wrapper.
 */
export default function PlaybooksPage() {
  return (
    <div className="fixed inset-0 left-64 z-10">
      <PlaybookLibrary />
    </div>
  )
}
