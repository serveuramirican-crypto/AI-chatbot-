import { SnippetViewer } from "@/components/script-generator/SnippetViewer"

export default function ScriptGeneratorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Script Generator</h1>
        <p className="text-muted-foreground mt-1">
          Get the embed code to add the AI chatbot to your website.
        </p>
      </div>
      <SnippetViewer />
    </div>
  )
}
