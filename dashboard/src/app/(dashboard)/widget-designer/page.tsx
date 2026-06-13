import { Designer } from "@/components/widget-designer/Designer"

export default function WidgetDesignerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Widget Designer</h1>
        <p className="text-muted-foreground mt-1">
          Customize the appearance and behavior of your chat widget.
        </p>
      </div>
      <Designer />
    </div>
  )
}
