"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Preview, type WidgetSettings } from "./Preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Save } from "lucide-react"

const defaultSettings: WidgetSettings = {
  color: "#2563eb",
  header_text: "Chat with us!",
  logo_url: "",
  position: "bottom-right",
  welcome_message: "Hi! How can I help you today?",
  enable_ai_fallback: false,
  ai_model: "meta-llama/llama-3-8b-instruct:free",
  openrouter_api_key: ""
}

export function Designer() {
  const [settings, setSettings] = useState<WidgetSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('widget_settings')
      .select('*')
      .limit(1)
      .single()
      
    if (data) {
      setSettings(data)
    } else if (error && error.code === 'PGRST116') {
      // No rows exist yet, stick to default
    }
    setLoading(false)
  }

  const handleChange = (field: keyof WidgetSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    
    let logoUrl = settings.logo_url
    if (file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('widget_assets')
        .upload(fileName, file)
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('widget_assets')
          .getPublicUrl(fileName)
        logoUrl = publicUrlData.publicUrl
      }
    }

    const payload = { ...settings, logo_url: logoUrl }
    
    if (settings.id) {
      await supabase
        .from('widget_settings')
        .update(payload)
        .eq('id', settings.id)
    } else {
      const { data } = await supabase
        .from('widget_settings')
        .insert([payload])
        .select()
        .single()
      if (data) setSettings(data)
    }
    
    setSaving(false)
    setFile(null)
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading designer...</div>
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Settings Form */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Appearance</h3>
            
            <div className="grid gap-2">
              <Label htmlFor="color">Theme Color</Label>
              <div className="flex gap-3">
                <Input 
                  id="color" 
                  type="color" 
                  className="w-16 h-10 p-1 cursor-pointer"
                  value={settings.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                />
                <Input 
                  type="text" 
                  value={settings.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="header">Header Text</Label>
              <Input 
                id="header" 
                value={settings.header_text}
                onChange={(e) => handleChange('header_text', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logo">Logo Upload</Label>
              <Input 
                id="logo" 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">Upload a square image for best results.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium border-b pb-2">Behavior & Positioning</h3>
            
            <div className="grid gap-2">
              <Label htmlFor="position">Widget Position</Label>
              <Select 
                value={settings.position} 
                onValueChange={(val) => handleChange('position', val as string)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="welcome">Initial Welcome Message</Label>
              <Input 
                id="welcome" 
                value={settings.welcome_message}
                onChange={(e) => handleChange('welcome_message', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium border-b pb-2">AI Intelligence Settings</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="ai-fallback" className="flex flex-col gap-1">
                <span>Enable AI Fallback</span>
                <span className="font-normal text-xs text-muted-foreground">Uses OpenRouter when no exact knowledge base match is found.</span>
              </Label>
              <Switch 
                id="ai-fallback"
                checked={settings.enable_ai_fallback}
                onCheckedChange={(checked) => handleChange('enable_ai_fallback', checked as any)}
              />
            </div>

            {settings.enable_ai_fallback && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="model">AI Model (OpenRouter)</Label>
                  <Select 
                    value={settings.ai_model} 
                    onValueChange={(val) => handleChange('ai_model', val as string)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B Instruct (Free)</SelectItem>
                      <SelectItem value="google/gemini-pro">Google Gemini Pro</SelectItem>
                      <SelectItem value="openai/gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="anthropic/claude-3-haiku">Claude 3 Haiku</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="api_key">OpenRouter API Key</Label>
                  <Input 
                    id="api_key" 
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={settings.openrouter_api_key}
                    onChange={(e) => handleChange('openrouter_api_key', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Your API key is securely saved to your database.</p>
                </div>
              </>
            )}
          </div>

          <div className="pt-6 border-t flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <div>
        <div className="sticky top-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Live Preview</h3>
          <Preview settings={settings} />
        </div>
      </div>
    </div>
  )
}
