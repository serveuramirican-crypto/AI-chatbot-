"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

export function SnippetViewer() {
  const [copied, setCopied] = useState(false)
  const [host, setHost] = useState("")

  useEffect(() => {
    // In a real app, you might want to use the actual production URL or let the user configure it.
    // For this example, we use the window origin.
    if (typeof window !== "undefined") {
      setHost(window.location.origin)
    }
  }, [])

  const snippetCode = `
<script>
  (function(d, t) {
    var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
    v.onload = function() {
      window.initAIChatbot({
        host: "${host}",
        projectId: "uxihntppwtdhuxoiyfnx"
      });
    };
    v.src = "${host}/widget-loader.js";
    v.type = "text/javascript";
    s.parentNode.insertBefore(v, s);
  })(document, 'script');
</script>
  `.trim()

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(snippetCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy", err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed Code</CardTitle>
        <CardDescription>
          Copy the following script snippet and paste it just before the closing <code>&lt;/body&gt;</code> tag on your website.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <pre className="p-4 bg-slate-950 text-slate-50 rounded-lg overflow-x-auto text-sm">
            <code>{snippetCode}</code>
          </pre>
          <Button 
            variant="secondary" 
            size="sm" 
            className="absolute top-3 right-3 h-8"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy code'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          The widget dynamically loads in an isolated shadow DOM to prevent CSS conflicts with your website's styles.
        </p>
      </CardContent>
    </Card>
  )
}
