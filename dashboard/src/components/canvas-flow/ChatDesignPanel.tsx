"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { X, Check, Sparkles, Search, ChevronRight, ArrowRight } from "lucide-react"

// ── Chat Theme Types ──────────────────────────────────────────────────────────

export interface ChatTheme {
  id: string
  name: string
  headerBg: string
  headerText: string
  chatBg: string
  botBubbleBg: string
  botBubbleText: string
  userBubbleBg: string
  userBubbleText: string
  inputBg: string
  inputBorder: string
  inputText: string
  sendBtnBg: string
  sendBtnHover: string
  borderRadius: "rounded" | "sharp" | "pill"
  fontFamily: string
}

// ── Built-in Themes ───────────────────────────────────────────────────────────

export const PRESET_THEMES: ChatTheme[] = [
  {
    id: "classic-light",
    name: "Classic Light",
    headerBg: "#ffffff",
    headerText: "#111827",
    chatBg: "#f9fafb",
    botBubbleBg: "#f3f4f6",
    botBubbleText: "#1f2937",
    userBubbleBg: "#3b82f6",
    userBubbleText: "#ffffff",
    inputBg: "#f9fafb",
    inputBorder: "#e5e7eb",
    inputText: "#374151",
    sendBtnBg: "#3b82f6",
    sendBtnHover: "#2563eb",
    borderRadius: "rounded",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "midnight-dark",
    name: "Midnight Dark",
    headerBg: "#0f172a",
    headerText: "#f1f5f9",
    chatBg: "#1e293b",
    botBubbleBg: "#334155",
    botBubbleText: "#e2e8f0",
    userBubbleBg: "#6366f1",
    userBubbleText: "#ffffff",
    inputBg: "#1e293b",
    inputBorder: "#334155",
    inputText: "#e2e8f0",
    sendBtnBg: "#6366f1",
    sendBtnHover: "#4f46e5",
    borderRadius: "rounded",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    headerBg: "#0ea5e9",
    headerText: "#ffffff",
    chatBg: "#f0f9ff",
    botBubbleBg: "#e0f2fe",
    botBubbleText: "#0c4a6e",
    userBubbleBg: "#0ea5e9",
    userBubbleText: "#ffffff",
    inputBg: "#ffffff",
    inputBorder: "#bae6fd",
    inputText: "#0c4a6e",
    sendBtnBg: "#0ea5e9",
    sendBtnHover: "#0284c7",
    borderRadius: "pill",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "forest-green",
    name: "Forest Green",
    headerBg: "#14532d",
    headerText: "#f0fdf4",
    chatBg: "#f0fdf4",
    botBubbleBg: "#dcfce7",
    botBubbleText: "#14532d",
    userBubbleBg: "#16a34a",
    userBubbleText: "#ffffff",
    inputBg: "#ffffff",
    inputBorder: "#86efac",
    inputText: "#166534",
    sendBtnBg: "#16a34a",
    sendBtnHover: "#15803d",
    borderRadius: "rounded",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    headerBg: "#fdf2f8",
    headerText: "#831843",
    chatBg: "#fdf2f8",
    botBubbleBg: "#fce7f3",
    botBubbleText: "#831843",
    userBubbleBg: "#ec4899",
    userBubbleText: "#ffffff",
    inputBg: "#ffffff",
    inputBorder: "#fbcfe8",
    inputText: "#9d174d",
    sendBtnBg: "#ec4899",
    sendBtnHover: "#db2777",
    borderRadius: "pill",
    fontFamily: "Georgia, serif",
  },
  {
    id: "sunset-orange",
    name: "Sunset",
    headerBg: "#431407",
    headerText: "#fff7ed",
    chatBg: "#fff7ed",
    botBubbleBg: "#ffedd5",
    botBubbleText: "#431407",
    userBubbleBg: "#f97316",
    userBubbleText: "#ffffff",
    inputBg: "#ffffff",
    inputBorder: "#fed7aa",
    inputText: "#7c2d12",
    sendBtnBg: "#f97316",
    sendBtnHover: "#ea580c",
    borderRadius: "rounded",
    fontFamily: "Inter, sans-serif",
  },
  {
    id: "neon-cyber",
    name: "Cyber Neon",
    headerBg: "#09090b",
    headerText: "#a3e635",
    chatBg: "#09090b",
    botBubbleBg: "#18181b",
    botBubbleText: "#a3e635",
    userBubbleBg: "#84cc16",
    userBubbleText: "#09090b",
    inputBg: "#18181b",
    inputBorder: "#3f3f46",
    inputText: "#a3e635",
    sendBtnBg: "#84cc16",
    sendBtnHover: "#65a30d",
    borderRadius: "sharp",
    fontFamily: "'Courier New', monospace",
  },
  {
    id: "lavender-dream",
    name: "Lavender Dream",
    headerBg: "#7c3aed",
    headerText: "#faf5ff",
    chatBg: "#faf5ff",
    botBubbleBg: "#ede9fe",
    botBubbleText: "#4c1d95",
    userBubbleBg: "#7c3aed",
    userBubbleText: "#ffffff",
    inputBg: "#ffffff",
    inputBorder: "#ddd6fe",
    inputText: "#5b21b6",
    sendBtnBg: "#7c3aed",
    sendBtnHover: "#6d28d9",
    borderRadius: "pill",
    fontFamily: "Inter, sans-serif",
  },
]

export const DEFAULT_THEME = PRESET_THEMES[0]

// ── Context ───────────────────────────────────────────────────────────────────

interface ChatThemeContextValue {
  theme: ChatTheme
  setTheme: (theme: ChatTheme) => void
}

const ChatThemeContext = createContext<ChatThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
})

export function ChatThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ChatTheme>(DEFAULT_THEME)
  return (
    <ChatThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ChatThemeContext.Provider>
  )
}

export function useChatTheme() {
  return useContext(ChatThemeContext)
}

// ── Color Swatch ──────────────────────────────────────────────────────────────

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1">
        <div
          className="h-7 w-7 rounded-lg border border-gray-200 shadow-sm cursor-pointer overflow-hidden shrink-0"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 font-mono outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
          maxLength={7}
        />
      </div>
    </div>
  )
}

// ── ChatDesignPanel Component ─────────────────────────────────────────────────

interface ChatDesignPanelProps {
  onClose: () => void
}

export default function ChatDesignPanel({ onClose }: ChatDesignPanelProps) {
  const { theme, setTheme } = useChatTheme()
  const [activeTab, setActiveTab] = useState<"themes" | "colors">("themes")
  const [activePreviewTab, setActivePreviewTab] = useState<"accueil" | "messages" | "aide">("accueil")

  const updateColor = useCallback(
    (key: keyof ChatTheme, value: string) => {
      setTheme({ ...theme, [key]: value })
    },
    [theme, setTheme]
  )

  const borderRadiusOptions: { value: ChatTheme["borderRadius"]; label: string; tw: string }[] = [
    { value: "rounded", label: "Rounded", tw: "rounded-xl" },
    { value: "pill", label: "Pill", tw: "rounded-full" },
    { value: "sharp", label: "Sharp", tw: "rounded-sm" },
  ]

  return (
    // Full-screen overlay backdrop
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
    {/* Large two-column panel */}
    <div
      className="flex overflow-hidden shadow-2xl"
      style={{
        width: "min(1040px, 95vw)",
        height: "min(720px, 92vh)",
        background: "white",
        borderRadius: 22,
      }}
    >

      {/* ── LEFT: Controls (420px) ─────────────────────────────────────── */}
      <div className="flex flex-col" style={{ width: 420, flexShrink: 0, borderRight: "1px solid #f0f0f0" }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-white opacity-90" />
            <span className="text-base font-semibold text-white">Design Chat</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {(["themes", "colors"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                activeTab === tab
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "themes" ? "🎨  Themes" : "🖌️  Colors"}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Themes Tab ── */}
          {activeTab === "themes" && (
            <div className="p-5 flex flex-col gap-4">
              <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">
                Select a preset theme
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PRESET_THEMES.map((t) => {
                  const isSelected = theme.id === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t)}
                      className={`relative flex flex-col gap-2 p-3 text-left transition-all duration-150 hover:shadow-md active:scale-95`}
                      style={{
                        borderRadius: 14,
                        border: isSelected ? "2px solid #6366f1" : "2px solid #f3f4f6",
                        background: isSelected ? "#f5f3ff" : "white",
                      }}
                    >
                      {/* Color bar preview */}
                      <div className="flex h-8 w-full overflow-hidden" style={{ borderRadius: 8 }}>
                        <div className="flex-1" style={{ background: t.headerBg }} />
                        <div className="flex-1" style={{ background: t.botBubbleBg }} />
                        <div className="flex-1" style={{ background: t.userBubbleBg }} />
                        <div className="flex-1" style={{ background: t.sendBtnBg }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{t.name}</span>
                      {isSelected && (
                        <div
                          className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center"
                          style={{ borderRadius: "50%", background: "#6366f1" }}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Border Radius */}
              <div>
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-3">
                  Bubble Shape
                </p>
                <div className="flex gap-2">
                  {borderRadiusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateColor("borderRadius", opt.value)}
                      className="flex-1 flex flex-col items-center gap-2 py-3 transition-all"
                      style={{
                        borderRadius: 12,
                        border: theme.borderRadius === opt.value ? "2px solid #6366f1" : "2px solid #f3f4f6",
                        background: theme.borderRadius === opt.value ? "#eef2ff" : "white",
                      }}
                    >
                      <div className={`h-6 w-14 bg-indigo-400 ${opt.tw}`} />
                      <span className="text-xs text-gray-600 font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Colors Tab ── */}
          {activeTab === "colors" && (
            <div className="p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Header</p>
                <ColorSwatch label="Background" value={theme.headerBg} onChange={(v) => updateColor("headerBg", v)} />
                <ColorSwatch label="Text" value={theme.headerText} onChange={(v) => updateColor("headerText", v)} />
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Chat Area</p>
                <ColorSwatch label="Background" value={theme.chatBg} onChange={(v) => updateColor("chatBg", v)} />
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Bot Bubble</p>
                <ColorSwatch label="Background" value={theme.botBubbleBg} onChange={(v) => updateColor("botBubbleBg", v)} />
                <ColorSwatch label="Text" value={theme.botBubbleText} onChange={(v) => updateColor("botBubbleText", v)} />
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">User Bubble</p>
                <ColorSwatch label="Background" value={theme.userBubbleBg} onChange={(v) => updateColor("userBubbleBg", v)} />
                <ColorSwatch label="Text" value={theme.userBubbleText} onChange={(v) => updateColor("userBubbleText", v)} />
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Input</p>
                <ColorSwatch label="Background" value={theme.inputBg} onChange={(v) => updateColor("inputBg", v)} />
                <ColorSwatch label="Border" value={theme.inputBorder} onChange={(v) => updateColor("inputBorder", v)} />
                <ColorSwatch label="Text" value={theme.inputText} onChange={(v) => updateColor("inputText", v)} />
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Send Button</p>
                <ColorSwatch label="Background" value={theme.sendBtnBg} onChange={(v) => updateColor("sendBtnBg", v)} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex gap-2">
          <button
            onClick={() => setTheme(DEFAULT_THEME)}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition"
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
          >
            Apply & Close
          </button>
        </div>
      </div>

      {/* ── RIGHT: Live Widget Preview ──────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center relative"
        style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #faf0ff 100%)" }}
      >
        {/* Publish Button */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={() => {
              alert("Design publié avec succès dans le chat (Run) !");
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 shadow-lg border border-indigo-400"
          >
            <Sparkles className="h-4 w-4" />
            Publish
          </button>
        </div>

        <div className="flex flex-col items-center gap-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">Live Preview</p>

          {/* Widget Preview — real size */}
          <div
            className="flex flex-col overflow-hidden shadow-2xl"
            style={{
              width: 370,
              height: 580,
              borderRadius: 20,
              fontFamily: theme.fontFamily,
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            {/* Widget Header */}
            {activePreviewTab === "accueil" ? (
              <div style={{ background: theme.headerBg, padding: "20px 24px 24px", minHeight: 158, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 2 }}>
                      <img src="https://cdn.shopify.com/s/files/1/0156/6146/files/Gymshark_Logo_White_200x.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: theme.headerText, letterSpacing: "0.5px" }}>GYMSHARK</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>
                      <X className="h-4 w-4" style={{ color: theme.headerText }} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, color: theme.headerText, lineHeight: 1.25, marginTop: 4 }}>
                  Bonjour 👋<br />Comment pouvons-<br />nous vous aider ?
                </div>
              </div>
            ) : (
              <div style={{ background: "white", padding: "16px 20px", borderBottom: "1px solid #eee", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>
                  {activePreviewTab === "messages" ? "Messages" : "Aide"}
                </span>
                <button style={{ background: "none", border: "none", cursor: "default", padding: 4, display: "flex", alignItems: "center" }}>
                  <X className="h-5 w-5" style={{ color: "#aaa" } as React.CSSProperties} />
                </button>
              </div>
            )}

            {/* Body */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

              {/* ── ACCUEIL ── */}
              {activePreviewTab === "accueil" && (
                <div style={{ flex: 1, overflowY: "auto", background: "#f5f5f3", borderRadius: "16px 16px 0 0", marginTop: -14, padding: "18px 16px 12px", scrollbarWidth: "none" } as React.CSSProperties}>
                  
                  {/* Expected Delivery Date Block */}
                  <div className="cursor-pointer" style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 10 }}>
                    <div style={{ textAlign: "left", flex: 1, paddingRight: 12 }}>
                      <strong style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>Expected Delivery Date</strong>
                      <span style={{ fontSize: 13, color: "#666", display: "block", lineHeight: 1.4 }}>Wondering when to expect your order?</span>
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 22 }}>
                      📦
                    </div>
                  </div>

                  {/* Date de livraison prévue Block */}
                  <div className="cursor-pointer" style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 10 }}>
                    <div style={{ textAlign: "left", flex: 1, paddingRight: 12 }}>
                      <strong style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>Date de livraison prévue 🚚</strong>
                      <span style={{ fontSize: 13, color: "#666", display: "block", lineHeight: 1.4 }}>Vous vous demandez quand attendre votre commande ?</span>
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 22 }}>
                      🚚
                    </div>
                  </div>

                  {/* FAQ Section Card */}
                  <div style={{ background: "#fff", borderRadius: 14, marginBottom: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #f0f0f0" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Trouver une réponse</span>
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    {["Politique des Retours", "Problèmes avec votre commande ?", "Informations de livraison"].map((item, idx, arr) => (
                      <div
                        key={item}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 18px", borderBottom: idx < arr.length - 1 ? "1px solid #f5f5f5" : "none", fontSize: 14, color: "#4b5563", textAlign: "left", cursor: "pointer" }}
                      >
                        <span>{item}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>

                  {/* Message CTA */}
                  <div
                    onClick={() => setActivePreviewTab("messages")}
                    className="cursor-pointer"
                    style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 10 }}
                  >
                    <div style={{ textAlign: "left", flex: 1, paddingRight: 12 }}>
                      <strong style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>Envoyez-nous un message</strong>
                      <span style={{ fontSize: 13, color: "#666", display: "block", lineHeight: 1.4 }}>Nous répondons généralement dans les 5 heures</span>
                    </div>
                    <div style={{ width: 36, height: 36, background: theme.headerBg === "#ffffff" ? "#000" : theme.headerBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ArrowRight className="h-4 w-4" style={{ color: theme.headerBg === "#ffffff" ? "#fff" : theme.headerText }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── MESSAGES ── */}
              {activePreviewTab === "messages" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px", background: "white" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", width: "100%", textAlign: "left", cursor: "pointer", background: "none", border: "none", borderBottom: "1px solid #f5f5f5" }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20, color: "#888" }}><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>GYMSHARK Bot</span>
                          <span style={{ fontSize: 11, color: "#10b981", fontWeight: 500 }}>Actif</span>
                        </div>
                        <p style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                          Bonjour ! Comment puis-je vous aider ?
                        </p>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "12px 16px", borderTop: "1px solid #eee", background: "white", flexShrink: 0 }}>
                    <button
                      style={{ width: "100%", background: "#1a1a1a", color: "white", borderRadius: 50, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}
                    >
                      Envoyez-nous un message
                      <svg viewBox="0 0 24 24" fill="white" style={{ width: 16, height: 16 }}>
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── AIDE ── */}
              {activePreviewTab === "aide" && (
                <div style={{ flex: 1, overflowY: "auto", background: "#f5f5f3", padding: "16px", scrollbarWidth: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(0,0,0,0.04)", marginBottom: 16 }}>
                    <Search className="h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Rechercher de l'aide..." disabled style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#111", background: "transparent", fontFamily: theme.fontFamily }} />
                  </div>
                  <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,0,0,0.04)" }}>
                    {[
                      { name: "LIVRAISONS", count: 6 },
                      { name: "RETOURS", count: 6 },
                      { name: "PAIEMENTS, PROMOTIONS ET CARTES-CADEAUX", count: 8 },
                      { name: "TECHNIQUE", count: 4 },
                      { name: "PRODUIT", count: 10 },
                    ].map((cat, idx, arr) => (
                      <div
                        key={cat.name}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: idx < arr.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer" }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 4 }}>{cat.name}</div>
                          <div style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{cat.count} articles</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Placeholder (Only on actual chat view, removed from accueil to match screenshot) */}
            {(activePreviewTab as string) === "dummy_removed_input" && (
              <div style={{ background: "white", borderTop: "1px solid #eee", padding: "8px 12px", flexShrink: 0 }}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 ${
                    theme.borderRadius === "pill" ? "rounded-full"
                    : theme.borderRadius === "sharp" ? "rounded-sm"
                    : "rounded-xl"
                  }`}
                  style={{ border: `1px solid ${theme.inputBorder}`, background: theme.inputBg }}
                >
                  <span className="flex-1 text-xs opacity-50" style={{ color: theme.inputText }}>Écrivez votre message...</span>
                  <div
                    className={`h-6 w-6 flex items-center justify-center shrink-0 ${
                      theme.borderRadius === "pill" ? "rounded-full" : "rounded-lg"
                    }`}
                    style={{ background: theme.sendBtnBg }}
                  >
                    <span className="text-white text-[10px]">↑</span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom tabs */}
            <div style={{ display: "flex", background: "white", borderTop: "1px solid #eee", flexShrink: 0, padding: "6px 0 10px", alignItems: "center" }}>
              {[
                {
                  id: "accueil", label: "Accueil",
                  svg: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  ),
                },
                {
                  id: "messages", label: "Messages",
                  svg: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  ),
                },
                {
                  id: "aide", label: "Aide",
                  svg: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  ),
                },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivePreviewTab(tab.id as any)}
                  className="transition-colors hover:bg-gray-50 cursor-pointer"
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: "none", color: tab.id === activePreviewTab ? "#111" : "#aaa", padding: "6px 0", borderRadius: 8, margin: "0 4px" }}
                >
                  {tab.svg}
                  <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
    </div>
  )
}

