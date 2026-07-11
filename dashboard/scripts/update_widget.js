const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/(widget)/widget/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// We need to add state for widgetTab and messagesView
if (!content.includes('const [widgetTab, setWidgetTab]')) {
  content = content.replace(
    'const [inputValue, setInputValue] = useState("")',
    `const [inputValue, setInputValue] = useState("")
  const [widgetTab, setWidgetTab] = useState<"accueil" | "messages" | "aide">("accueil")
  const [messagesView, setMessagesView] = useState<"list" | "chat">("list")
  
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
    sendBtnHover: "#374151",
    borderRadius: "rounded" as const,
    fontFamily: "Inter, sans-serif"
  }`
  );
}

// Ensure icons are imported
const icons = ['MessageSquare', 'X', 'Send', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Search', 'ChevronRight', 'Bot', 'RefreshCw'];
icons.forEach(icon => {
  if (!content.includes(icon + ',')) {
    content = content.replace('import { MessageSquare,', `import { ${icons.join(', ')} } from "lucide-react"\n// import { MessageSquare,`);
  }
});

// Now replace the entire return (...) block for WidgetContent
const returnBlockStart = content.indexOf('return (', content.indexOf('const isRight = settings.position === \'bottom-right\''));
const returnBlockEnd = content.indexOf('}\n\nconst getProxyUrl', returnBlockStart);

const newReturnBlock = `return (
    <div className="w-full h-full p-4 pointer-events-none flex flex-col justify-end">
      <div className={\`w-full flex flex-col \${isRight ? 'items-end' : 'items-start'} pointer-events-auto\`}>
        
        {/* Chat Window */}
        {open && (
          <div className="w-[420px] h-[650px] bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden mb-4 pointer-events-auto" style={{ fontFamily: theme.fontFamily }}>
            
            {/* DYNAMIC HEADER */}
            {widgetTab === "accueil" ? (
              <div style={{ background: theme.headerBg, padding: "20px 24px 24px", minHeight: 158, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 2 }}>
                      <img src="https://cdn.shopify.com/s/files/1/0156/6146/files/Gymshark_Logo_White_200x.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: theme.headerText, letterSpacing: "0.5px" }}>GYMSHARK</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <X className="h-4 w-4" />
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
                  {widgetTab === "messages" ? "Messages" : "Aide"}
                </span>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                  <X className="h-5 w-5" style={{ color: "#aaa" } as React.CSSProperties} />
                </button>
              </div>
            )}

            {/* BODY */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              
              {/* ACCUEIL TAB */}
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
                      <button
                        key={item}
                        onClick={() => setWidgetTab("aide")}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 18px", borderBottom: idx < arr.length - 1 ? "1px solid #f5f5f5" : "none", cursor: "pointer", fontSize: 14, color: "#4b5563", textAlign: "left", background: "none", border: "none" }}
                      >
                        <span>{item}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setWidgetTab("messages"); setMessagesView("list") }}
                    style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", cursor: "pointer", marginBottom: 10 }}
                  >
                    <div style={{ textAlign: "left", flex: 1, paddingRight: 12 }}>
                      <strong style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>Envoyez-nous un message</strong>
                      <span style={{ fontSize: 13, color: "#666", display: "block", lineHeight: 1.4 }}>Nous répondons généralement dans les 5 heures</span>
                    </div>
                    <div style={{ width: 36, height: 36, background: theme.headerBg === "#ffffff" ? "#000" : theme.headerBg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ArrowRight className="h-4 w-4" style={{ color: theme.headerBg === "#ffffff" ? "#fff" : theme.headerText }} />
                    </div>
                  </button>
                </div>
              )}

              {/* AIDE TAB */}
              {widgetTab === "aide" && (
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

              {/* MESSAGES TAB */}
              {widgetTab === "messages" && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {messagesView === "list" ? (
                    <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px", background: "white" }}>
                      <button
                        onClick={() => setMessagesView("chat")}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", width: "100%", textAlign: "left", cursor: "pointer", background: "none", border: "none", borderBottom: "1px solid #f5f5f5" }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          <Bot className="h-5 w-5" style={{ color: "#888" } as React.CSSProperties} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>GYMSHARK Bot</span>
                            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 500 }}>Actif</span>
                          </div>
                          <p style={{ fontSize: 12, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                            {messages.length > 0 ? (messages.find(m => m.role === "bot")?.content?.slice(0, 55) || "Nous sommes là pour vous aider!") : "Nous sommes là pour vous aider!"}
                          </p>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: theme.chatBg }}>
                      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {messages.length === 0 && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
                            <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                            <p style={{ fontSize: 14, color: "#888" }}>Aucun message pour l&apos;instant.<br/>Écrivez-nous, on répond vite !</p>
                            
                            {/* Suggested Buttons */}
                            <div className="flex flex-wrap gap-2 mt-6 justify-center">
                              {initialButtons.map((btnText, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSend(btnText)}
                                  className="bg-blue-50 text-blue-500 hover:bg-blue-100 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border border-blue-100"
                                >
                                  {btnText}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {messages.map((msg, idx) => (
                          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: msg.role === "user" ? "flex-end" : "flex-start", width: "100%" }}>
                            {msg.product && (
                              <ProductCarousel products={Array.isArray(msg.product) ? msg.product : (msg.product ? [msg.product] : undefined)} />
                            )}
                            <div style={{ display: "flex", gap: 8, maxWidth: "85%", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                              {msg.role === "bot" && (
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e5e7eb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                  <Bot className="h-4 w-4" style={{ color: "#6b7280" } as React.CSSProperties} />
                                </div>
                              )}
                              <div style={{ padding: "12px 16px", fontSize: 14, lineHeight: 1.5, background: msg.role === "user" ? theme.userBubbleBg : theme.botBubbleBg, color: msg.role === "user" ? theme.userBubbleText : theme.botBubbleText, borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                {msg.content}
                              </div>
                            </div>
                            
                            {/* Dynamic Buttons for AI */}
                            {idx === messages.length - 1 && msg.role === 'bot' && msg.suggestedButtons && msg.suggestedButtons.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-1 ml-10">
                                {msg.suggestedButtons.map((btnText: string, i: number) => (
                                  <button
                                    key={i}
                                    onClick={() => handleSend(btnText)}
                                    className="bg-blue-50 text-blue-500 hover:bg-blue-100 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border border-blue-100"
                                  >
                                    {btnText}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {loading && (
                          <div style={{ display: "flex", gap: 8, maxWidth: "85%" }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e5e7eb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                              <Bot className="h-4 w-4" style={{ color: "#6b7280" } as React.CSSProperties} />
                            </div>
                            <div style={{ padding: "12px 16px", background: theme.botBubbleBg, borderRadius: "18px 18px 18px 4px", display: "flex", alignItems: "center", gap: 4 }}>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* INPUT */}
                      <div style={{ padding: "12px 16px", background: theme.inputBg, borderTop: \`1px solid \${theme.inputBorder}\` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f4f6", borderRadius: 24, padding: "8px 12px", border: "1px solid #e5e7eb" }}>
                          <input
                            type="text"
                            placeholder="Message..."
                            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: theme.inputText }}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                          />
                          <button
                            disabled={loading || !inputValue.trim()}
                            onClick={() => handleSend()}
                            style={{ background: theme.sendBtnBg, color: "#fff", border: "none", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: loading || !inputValue.trim() ? "not-allowed" : "pointer", opacity: loading || !inputValue.trim() ? 0.5 : 1 }}
                          >
                            <Send className="h-4 w-4 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* BOTTOM NAV TABS */}
            <div style={{ display: "flex", borderTop: "1px solid #eee", background: "white", padding: "8px 16px 16px", flexShrink: 0, justifyContent: "space-around" }}>
              <button
                onClick={() => setWidgetTab("accueil")}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: widgetTab === "accueil" ? "#111" : "#888" }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: widgetTab === "accueil" ? "#f5f5f5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: widgetTab === "accueil" ? 600 : 500 }}>Accueil</span>
              </button>
              <button
                onClick={() => { setWidgetTab("messages"); setMessagesView("list") }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: widgetTab === "messages" ? "#111" : "#888" }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: widgetTab === "messages" ? "#f5f5f5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: widgetTab === "messages" ? 600 : 500 }}>Messages</span>
              </button>
              <button
                onClick={() => setWidgetTab("aide")}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: widgetTab === "aide" ? "#111" : "#888" }}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: widgetTab === "aide" ? "#f5f5f5" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: widgetTab === "aide" ? 600 : 500 }}>Aide</span>
              </button>
            </div>

          </div>
        )}

        {/* Launcher Button */}
        {!open && (
          <button 
            className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-105 transition-transform pointer-events-auto"
            style={{ backgroundColor: settings.color }}
            onClick={() => setOpen(true)}
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  )
`

content = content.substring(0, returnBlockStart) + newReturnBlock + '\n' + content.substring(returnBlockEnd);

fs.writeFileSync(pagePath, content);
console.log('Successfully updated widget page with new GymShark design.');
