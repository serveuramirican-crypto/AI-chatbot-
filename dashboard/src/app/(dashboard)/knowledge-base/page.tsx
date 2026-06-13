import { DataSources } from "@/components/knowledge-base/DataSources"

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Manage the data sources that your AI chatbot uses to answer questions.
        </p>
      </div>
      <DataSources />
    </div>
  )
}
