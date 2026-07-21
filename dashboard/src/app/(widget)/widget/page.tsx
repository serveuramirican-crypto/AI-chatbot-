"use client"

import { Suspense, useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { MessageSquare, X, Send, ArrowLeft, ArrowRight, Search, ChevronRight, Bot, MousePointerClick } from "lucide-react"
import { useWorkflowExecutor } from "@/hooks/useWorkflowExecutor"
import type { ProductItem } from "@/lib/workflowHelpers"

// ── Proxy helper ───────────────────────────────────────────────────────────────
const getProxyUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http') && !url.includes('placehold.co')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

// ── Product Card (mirrors RunModal ProductCard exactly) ────────────────────────
function ProductCard({ product, compact = false }: { product: ProductItem; compact?: boolean }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${compact ? "w-52 shrink-0 snap-start" : "w-full"}`}>
      <div className="relative overflow-hidden bg-gray-100" style={{ height: compact ? 180 : 220 }}>
        <img
          src={getProxyUrl(product.image_url || product.image)}
          alt={product.name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://placehold.co/400x500/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`;
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-sm font-bold leading-snug text-gray-900 line-clamp-2">
          {product.name}{product.price ? ` - ${product.price}` : ""}
        </p>
        {product.description && (
          <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-2">{product.description}</p>
        )}
        {(product.color || product.size || product.category || product.fabric) && (
          <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-gray-600">
            {product.color && <div><span className="font-semibold text-gray-800">Couleur:</span> {product.color}</div>}
            {product.size && <div><span className="font-semibold text-gray-800">Taille:</span> {product.size}</div>}
            {product.category && <div><span className="font-semibold text-gray-800">Catégorie:</span> {product.category}</div>}
            {product.fabric && <div className="line-clamp-1"><span className="font-semibold text-gray-800">Tissu:</span> {product.fabric}</div>}
          </div>
        )}
        <div className="flex-1" />
        <a
          href={product.link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block w-full rounded-lg border border-gray-300 py-2 text-center text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
        >
          Voir le Produit ↓
        </a>
      </div>
    </div>
  );
}

// ── Product Carousel (mirrors RunModal ProductCarousel exactly) ────────────────
function ProductCarousel({ products }: { products: ProductItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  if (!products || products.length === 0) return null;

  if (products.length === 1) {
    return <div className="w-full"><ProductCard product={products[0]} compact={false} /></div>;
  }

  return (
    <div className="relative w-full">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-[90px] z-10 flex h-7 w-7 -translate-x-1 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md hover:bg-gray-50"
      >
        &#8592;
      </button>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {products.map((product, idx) => (
          <ProductCard key={`${product.name}-${idx}`} product={product} compact={true} />
        ))}
      </div>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-[90px] z-10 flex h-7 w-7 translate-x-1 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md hover:bg-gray-50"
      >
        &#8594;
      </button>
    </div>
  );
}

// ── Product Details Table (mirrors RunModal's Arabic details table) ─────────────
function ProductDetailsTable({ products, closingText }: { products: ProductItem[]; closingText?: string }) {
  return (
    <div dir="rtl" className="flex flex-col gap-3 rounded-xl bg-[#f8f9fa] border border-gray-100 p-3.5 text-sm text-gray-800 shadow-sm mt-2">
      <p className="font-medium text-gray-700">هاهي التفاصيل ديال كل {products[0]?.category || "منتج"}:</p>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-[11px]">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 px-1 font-medium whitespace-nowrap w-[35%]">المنتج</th>
              <th className="py-2 px-1 font-medium text-center whitespace-nowrap">اللون</th>
              <th className="py-2 px-1 font-medium text-center whitespace-nowrap">القماش</th>
              <th className="py-2 px-1 font-medium text-center whitespace-nowrap">القصة</th>
              <th className="py-2 px-1 font-medium text-center whitespace-nowrap">السعر</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => (
              <tr key={idx} className="border-b border-gray-100 last:border-0 text-gray-700">
                <td className="py-2.5 px-1 align-top">
                  <div className="flex gap-1.5 items-start">
                    <span className="font-semibold text-gray-400">{idx + 1}</span>
                    <span className="line-clamp-3">{p.name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-1 align-top text-center font-medium">
                  <div className="flex items-center justify-center gap-1">
                    {p.color || "-"}
                    {p.color?.toLowerCase() === 'bordeaux' && <span className="text-red-500 text-[10px]">🔴</span>}
                    {p.color?.toLowerCase() === 'beige' && <span className="text-amber-700 text-[10px]">🟤</span>}
                    {p.color?.toLowerCase() === 'bleu' && <span className="text-blue-500 text-[10px]">🔵</span>}
                    {p.color?.toLowerCase() === 'kaki' && <span className="text-green-500 text-[10px]">🟢</span>}
                  </div>
                </td>
                <td className="py-2.5 px-1 align-top text-center text-gray-600">{p.fabric || "-"}</td>
                <td className="py-2.5 px-1 align-top text-center text-gray-600">{p.category || "Boxy Fit"}</td>
                <td className="py-2.5 px-1 align-top text-center font-semibold whitespace-nowrap font-sans text-gray-900">{p.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs font-medium text-gray-500">S, M, L كلها متوفرة بمقاسات 👌</p>
      {closingText && <p className="text-sm font-medium text-gray-800 mt-1">{closingText}</p>}
    </div>
  );
}

function WidgetContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [settings, setSettings] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [widgetTab, setWidgetTab] = useState<"accueil" | "messages" | "aide">("messages")
  const [messagesView, setMessagesView] = useState<"list" | "chat">("chat")

  const chatEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    loading,
    runState,
    isWorkflowActive,
    handleSend: executorHandleSend,
    handleButtonClick,
    handleQuickReply,
  } = useWorkflowExecutor(projectId)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('widget_settings')
        .select('*')
        .limit(1)
        .single()
      if (data) setSettings(data)
    }
    fetchSettings()
  }, [projectId])

  const handleSend = async (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : inputValue;
    if (!textToSend.trim() || loading) return
    if (typeof overrideText !== 'string') setInputValue("")
    executorHandleSend(textToSend)
  }

  if (!settings) return null

  const isRight = settings.position === 'bottom-right'

  // Theme pulled from settings
  const theme = {
    headerBg: "#ffffff",
    headerText: "#111827",
    chatBg: "#f9fafb",
    botBubbleBg: "#f3f4f6",
    botBubbleText: "#1f2937",
    userBubbleBg: settings?.color || "#111827",
    userBubbleText: "#ffffff",
    inputBg: "#ffffff",
    inputBorder: "#e5e7eb",
    inputText: "#374151",
    sendBtnBg: settings?.color || "#111827",
    fontFamily: "Inter, sans-serif",
  }

  // Parse initial buttons from welcome message (only shown when no workflow)
  const welcomeTextRaw = settings.welcome_message || "";
  const initialButtons: string[] = [];
  const btnRegex = /\[BUTTON\](.*?)\[\/BUTTON\]/g;
  let match;
  while ((match = btnRegex.exec(welcomeTextRaw)) !== null) {
    initialButtons.push(match[1].trim());
  }
  if (initialButtons.length === 0) {
    initialButtons.push("Order Support", "Suivre Ma Commande", "FAQ Questions", "Parcourir Vêtements", "Style & Outfit Help");
  }

  return (
    <div className="w-full h-full p-4 pointer-events-none flex flex-col justify-end">
      <div className={`w-full flex flex-col ${isRight ? 'items-end' : 'items-start'} pointer-events-auto`}>

        {/* ── Chat Window ───────────────────────────────────────────────────── */}
        {open && (
          <div
            className="w-[420px] h-[650px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden mb-4 pointer-events-auto"
            style={{ fontFamily: theme.fontFamily }}
          >
            {/* HEADER */}
            <div style={{ background: "white", padding: "16px 20px", borderBottom: "1px solid #eee", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>
                {widgetTab === "messages" ? "Messages" : widgetTab === "aide" ? "Aide" : "Accueil"}
              </span>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                <X className="h-5 w-5" style={{ color: "#aaa" } as React.CSSProperties} />
              </button>
            </div>

            {/* BODY */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

              {/* ── ACCUEIL TAB ── */}
              {widgetTab === "accueil" && (
                <div style={{ flex: 1, overflowY: "auto", background: "#f5f5f3", borderRadius: "16px 16px 0 0", padding: "18px 16px 12px", scrollbarWidth: "none" } as React.CSSProperties}>
                  <div className="cursor-pointer" style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 10 }}>
                    <div style={{ textAlign: "left", flex: 1, paddingRight: 12 }}>
                      <strong style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>Expected Delivery Date</strong>
                      <span style={{ fontSize: 13, color: "#666", display: "block", lineHeight: 1.4 }}>Wondering when to expect your order?</span>
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 22 }}>📦</div>
                  </div>
                  <div className="cursor-pointer" style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 10 }}>
                    <div style={{ textAlign: "left", flex: 1, paddingRight: 12 }}>
                      <strong style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>Date de livraison prévue 🚚</strong>
                      <span style={{ fontSize: 13, color: "#666", display: "block", lineHeight: 1.4 }}>Vous vous demandez quand attendre votre commande ?</span>
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 22 }}>🚚</div>
                  </div>
                  <div style={{ background: "#fff", borderRadius: 14, marginBottom: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,0.07)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #f0f0f0" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Trouver une réponse</span>
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    {["Politique des Retours", "Problèmes avec votre commande ?", "Informations de livraison"].map((item, idx, arr) => (
                      <button key={item} onClick={() => setWidgetTab("aide")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 18px", borderBottom: idx < arr.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer", fontSize: 14, color: "#4b5563", textAlign: "left", background: "none", border: "none" }}>
                        <span>{item}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setWidgetTab("messages"); setMessagesView("chat"); }} style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", cursor: "pointer", marginBottom: 10 }}>
                    <div style={{ textAlign: "left", flex: 1, paddingRight: 12 }}>
                      <strong style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>Envoyez-nous un message</strong>
                      <span style={{ fontSize: 13, color: "#666", display: "block", lineHeight: 1.4 }}>Nous répondons généralement dans les 5 heures</span>
                    </div>
                    <div style={{ width: 36, height: 36, background: "#000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ArrowRight className="h-4 w-4 text-white" />
                    </div>
                  </button>
                </div>
              )}

              {/* ── AIDE TAB ── */}
              {widgetTab === "aide" && (
                <div style={{ flex: 1, overflowY: "auto", background: "#f5f5f3", padding: "16px", scrollbarWidth: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid rgba(0,0,0,0.04)", marginBottom: 16 }}>
                    <Search className="h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Rechercher de l'aide..." disabled style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#111", background: "transparent", fontFamily: theme.fontFamily }} />
                  </div>
                  <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(0,0,0,0.04)" }}>
                    {[{ name: "LIVRAISONS", count: 6 }, { name: "RETOURS", count: 6 }, { name: "PAIEMENTS, PROMOTIONS ET CARTES-CADEAUX", count: 8 }, { name: "TECHNIQUE", count: 4 }, { name: "PRODUIT", count: 10 }].map((cat, idx, arr) => (
                      <div key={cat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: idx < arr.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer" }}>
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

              {/* ── MESSAGES TAB ── */}
              {widgetTab === "messages" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {/* CHAT VIEW — direct, no list intermediate */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12, background: theme.chatBg }}>

                    {/* Empty state */}
                    {messages.length === 0 && runState !== "running" && !loading && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
                        <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                        <p style={{ fontSize: 14, color: "#888" }}>Aucun message pour l&apos;instant.<br />Écrivez-nous, on répond vite !</p>
                        {/* Fallback buttons only when NO workflow is running */}
                        {!isWorkflowActive && (
                          <div className="flex flex-wrap gap-2 mt-6 justify-center">
                            {initialButtons.map((btnText, i) => (
                              <button key={i} onClick={() => handleSend(btnText)} className="bg-blue-50 text-blue-500 hover:bg-blue-100 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border border-blue-100">
                                {btnText}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Messages list — mirrors RunModal rendering exactly ── */}
                    {messages.map((msg, idx) => (
                      <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>

                        {/* Text bubble */}
                        {msg.text.trim() && (
                          <div
                            className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                            style={msg.role === "user"
                              ? { background: theme.userBubbleBg, color: theme.userBubbleText }
                              : { background: theme.botBubbleBg, color: theme.botBubbleText }
                            }
                          >
                            {msg.text}
                          </div>
                        )}

                        {/* Canvas-flow routing buttons (identical to RunModal) */}
                        {msg.role === "bot" && msg.buttons && msg.buttons.length > 0 && !msg.isCarousel && (
                          <div className="flex flex-col gap-1.5 w-full max-w-[80%]">
                            {msg.buttons.map((btn) => {
                              const isChosen = msg.chosenButtonId === btn.id;
                              const isLocked = !!msg.chosenButtonId;
                              const isWaiting = runState === "waiting";
                              return (
                                <button
                                  key={btn.id}
                                  disabled={isLocked || !isWaiting}
                                  onClick={() => handleButtonClick(btn.label, btn.id, msg.id)}
                                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-left transition-all duration-150 ${isChosen
                                    ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                                    : isLocked
                                      ? "border-gray-200 bg-gray-50 text-gray-400 cursor-default"
                                      : isWaiting
                                        ? "border-blue-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 cursor-pointer"
                                        : "border-gray-200 bg-gray-50 text-gray-400 cursor-default"
                                    }`}
                                >
                                  <MousePointerClick className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                  {btn.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Quick reply pills (identical to RunModal) */}
                        {msg.role === "bot" && msg.quickReplies && msg.quickReplies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 w-full max-w-[80%] mt-0.5">
                            {msg.quickReplies.map((reply) => (
                              <button
                                key={reply}
                                disabled={runState !== "waiting"}
                                onClick={() => handleQuickReply(reply)}
                                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${runState === "waiting"
                                  ? "border-blue-200 bg-white text-blue-600 hover:bg-blue-500 hover:text-white cursor-pointer"
                                  : "border-gray-200 bg-gray-50 text-gray-400 cursor-default"
                                  }`}
                              >
                                {reply}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Product cards + details table (identical to RunModal) */}
                        {msg.role === "bot" && msg.productCards && msg.productCards.length > 0 && (
                          <div className="w-full mt-1 flex flex-col gap-3">
                            <ProductCarousel products={msg.productCards} />
                            {!msg.isCarousel && (
                              <ProductDetailsTable products={msg.productCards} closingText={msg.closingText} />
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Typing indicator (identical to RunModal) */}
                    {(loading || runState === "running") && (
                      <div className="flex justify-start">
                        <div className="flex gap-1 px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: theme.botBubbleBg }}>
                          <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.botBubbleText, opacity: 0.5, animationDelay: "0ms" }} />
                          <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.botBubbleText, opacity: 0.5, animationDelay: "150ms" }} />
                          <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.botBubbleText, opacity: 0.5, animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* ── Chat Input (mirrors RunModal input area) ── */}
                  <div style={{ background: "white", borderTop: "1px solid #eee", padding: "10px 14px", flexShrink: 0 }}>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ border: `1px solid ${theme.inputBorder}`, background: theme.inputBg }}>
                      <input
                        type="text"
                        placeholder={runState === "waiting" ? "Écrivez votre message..." : "Message..."}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={runState !== "waiting" && runState !== "done"}
                        className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
                        style={{ color: theme.inputText }}
                      />
                      <button
                        disabled={(runState !== "waiting" && runState !== "done") || !inputValue.trim()}
                        onClick={() => handleSend()}
                        className="flex h-7 w-7 shrink-0 items-center justify-center text-white transition disabled:opacity-30 rounded-lg"
                        style={{ background: theme.sendBtnBg }}
                      >
                        <Send className="h-3.5 w-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── BOTTOM NAV TABS ── */}
            <div style={{ display: "flex", borderTop: "1px solid #eee", background: "white", padding: "8px 16px 16px", flexShrink: 0, justifyContent: "space-around" }}>
              <button onClick={() => setWidgetTab("accueil")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: widgetTab === "accueil" ? "#111" : "#888" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: widgetTab === "accueil" ? "#f5f5f5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: widgetTab === "accueil" ? 600 : 500 }}>Accueil</span>
              </button>
              <button onClick={() => { setWidgetTab("messages"); setMessagesView("chat"); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: widgetTab === "messages" ? "#111" : "#888" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: widgetTab === "messages" ? "#f5f5f5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: widgetTab === "messages" ? 600 : 500 }}>Messages</span>
              </button>
              <button onClick={() => setWidgetTab("aide")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: widgetTab === "aide" ? "#111" : "#888" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: widgetTab === "aide" ? "#f5f5f5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: widgetTab === "aide" ? 600 : 500 }}>Aide</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Launcher Button ── */}
        {!open && (
          <button
            className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-105 transition-transform pointer-events-auto"
            style={{ backgroundColor: settings.color }}
            onClick={() => { setOpen(true); setWidgetTab("messages"); setMessagesView("chat"); }}
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function WidgetPage() {
  return (
    <Suspense fallback={null}>
      <WidgetContent />
    </Suspense>
  )
}
