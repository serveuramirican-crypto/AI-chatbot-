"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Mic,
  ArrowUp,
  Search,
  ChevronDown,
  RefreshCw,
  Volume2,
  User,
  MousePointerClick,
  Bot,
  Home,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { MessageNodeData } from "./MessageNode";
import type { AgentConfig } from "@/types/agent";
import { useChatTheme } from "./ChatDesignPanel";

// ── Types ──────────────────────────────────────────────────────────────────────
interface LogEntry {
  id: string;
  level: "log" | "warn" | "error" | "info";
  time: string;
  message: string;
}

interface RunEdge {
  id: string;
  from: string;
  to: string;
  sourceHandleId?: string;
}

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  buttons?: { id: string; label: string }[];
  closingText?: string;
  quickReplies?: string[];
  productCards?: any[];
  chosenButtonId?: string;
}

type RunState = "idle" | "running" | "waiting" | "done";

interface RunModalProps {
  nodes: any[];
  edges: RunEdge[];
  agentsMap?: Record<string, AgentConfig>;
  onClose: () => void;
}

const makeId = () => Math.random().toString(36).slice(2, 9);
const timestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

import {
  ProductItem,
  parseProductDisplay,
  parseQuickReplies,
  stripThinking,
  matchExitCondition,
  parseDetailsTable,
} from "@/lib/workflowHelpers";

function getProxyUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("http") && !url.includes("placehold.co")) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// ── Product Card UI Components ─────────────────────────────────────────────────

function ProductCard({
  product,
  compact = false,
}: {
  product: ProductItem;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${compact ? "w-52 shrink-0 snap-start" : "w-full"
        }`}
    >
      {/* Image */}
      <div
        className="relative overflow-hidden bg-gray-100"
        style={{ height: compact ? 180 : 220 }}
      >
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

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {/* Name + price */}
        <p className="text-sm font-bold leading-snug text-gray-900 line-clamp-2">
          {product.name}
          {product.price ? ` - ${product.price}` : ""}
        </p>
        {/* Short description */}
        {product.description && (
          <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-2">
            {product.description}
          </p>
        )}
        {/* Extended details (color, size, fabric, category) */}
        {(product.color ||
          product.size ||
          product.category ||
          product.fabric) && (
            <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-gray-600">
              {product.color && (
                <div>
                  <span className="font-semibold text-gray-800">Couleur:</span>{" "}
                  {product.color}
                </div>
              )}
              {product.size && (
                <div>
                  <span className="font-semibold text-gray-800">Taille:</span>{" "}
                  {product.size}
                </div>
              )}
              {product.category && (
                <div>
                  <span className="font-semibold text-gray-800">Catégorie:</span>{" "}
                  {product.category}
                </div>
              )}
              {product.fabric && (
                <div className="line-clamp-1">
                  <span className="font-semibold text-gray-800">Tissu:</span>{" "}
                  {product.fabric}
                </div>
              )}
            </div>
          )}
        <div className="flex-1" /> {/* Spacer to push button to bottom */}
        {/* Outlined button */}
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

function ProductCarousel({ products }: { products: ProductItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -220 : 220,
      behavior: "smooth",
    });
  };

  if (products.length === 1) {
    return (
      <div className="w-full">
        <ProductCard product={products[0]} compact={false} />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Left nav arrow */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-[90px] z-10 flex h-7 w-7 -translate-x-1 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md hover:bg-gray-50"
        aria-label="Scroll left"
      >
        &#8592;
      </button>

      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {products.map((product, idx) => (
          <ProductCard
            key={`${product.name}-${idx}`}
            product={product}
            compact={true}
          />
        ))}
      </div>

      {/* Right nav arrow */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-[90px] z-10 flex h-7 w-7 translate-x-1 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md hover:bg-gray-50"
        aria-label="Scroll right"
      >
        &#8594;
      </button>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function RunModal({
  nodes,
  edges,
  agentsMap = {},
  onClose,
}: RunModalProps) {
  const { theme } = useChatTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [runState, setRunState] = useState<RunState>("idle");
  const [inputValue, setInputValue] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | "log" | "warn" | "error">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [widgetTab, setWidgetTab] = useState<"accueil" | "messages" | "aide">(
    "accueil",
  );
  /** Messages sub-view: list (conversation list) or chat (actual chat) */
  const [messagesView, setMessagesView] = useState<"list" | "chat">("list");
  /** The node currently executing in the graph walk */
  const [currentNode, setCurrentNode] = useState<MessageNodeData | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Payload: button click → "BTN::<label>::<buttonId>", plain text → raw string
  const waitResolveRef = useRef<((payload: string) => void) | null>(null);
  // Track which chat message id is currently waiting for a button pick
  const waitingMsgIdRef = useRef<string | null>(null);
  // Guard against React StrictMode double-invoking the mount effect
  const hasStartedRef = useRef(false);
  // Persistent session ID for the current run (one per agent node loop)
  const sessionIdRef = useRef<string | null>(null);
  /**
   * workflowMemory: maps agentNodeId → captured user reply text.
   * Set by a Message block with saveEntireReply=true, consumed once by
   * the connected Agent node. Strictly routed — other agent nodes never see it.
   */
  const workflowMemoryRef = useRef<Record<string, string>>({});

  const addLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [
      ...prev,
      { id: makeId(), level, time: timestamp(), message },
    ]);
  }, []);

  const addChat = useCallback((msg: Omit<ChatMessage, "id">) => {
    const id = makeId();
    setChat((prev) => [...prev, { id, ...msg }]);
    return id;
  }, []);

  // Auto-scroll
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ── Graph traversal helpers ──────────────────────────────────────────────────

  /** First node reachable from 'start' via a body-port edge (no sourceHandleId). */
  const findStartNode = useCallback((): MessageNodeData | null => {
    const startEdge = edges.find(
      (e) => e.from === "start" && !e.sourceHandleId,
    );
    if (!startEdge) return null;
    return nodes.find((n) => n.id === startEdge.to) ?? null;
  }, [edges, nodes]);

  /**
   * Find the next node to visit from `fromNodeId`.
   *
   * - clickedButtonId provided → strict match on sourceHandleId === clickedButtonId.
   *   Never falls back to a body-port edge; YES/NO always route independently.
   * - clickedButtonId undefined → body-port match (!sourceHandleId),
   *   used for plain waitForInput nodes and auto-advance.
   */
  const findNextNode = useCallback(
    (
      fromNodeId: string,
      clickedButtonId?: string,
    ): { node: MessageNodeData | null; deadEnd: boolean } => {
      let matchingEdge: RunEdge | undefined;

      if (clickedButtonId) {
        // Strict: must match the exact button handle — no silent fallthrough
        matchingEdge = edges.find(
          (e) => e.from === fromNodeId && e.sourceHandleId === clickedButtonId,
        );
      } else {
        // Body port: plain text or auto-advance
        matchingEdge = edges.find(
          (e) => e.from === fromNodeId && !e.sourceHandleId,
        );
      }

      if (!matchingEdge) return { node: null, deadEnd: true };

      // Self-loop guard
      if (matchingEdge.to === fromNodeId) {
        console.warn(
          `[RunModal] Edge "${matchingEdge.id}" loops back to itself — ignoring.`,
        );
        return { node: null, deadEnd: true };
      }

      const nextNode = nodes.find((n) => n.id === matchingEdge!.to) ?? null;
      return { node: nextNode, deadEnd: nextNode === null };
    },
    [edges, nodes],
  );

  // ── Workflow execution loop ──────────────────────────────────────────────────
  const runWorkflow = useCallback(async () => {
    setLogs([]);
    setChat([]);
    setRunState("running");
    setCurrentNode(null);
    sessionIdRef.current = null; // Reset session on each new run
    workflowMemoryRef.current = {}; // Clear any stale captured replies

    await sleep(400);
    addLog("info", "[Workflow] Starting execution...");
    addLog("log", "[Node] Entering → Start Node");
    await sleep(600);

    if (nodes.length === 0) {
      addLog(
        "warn",
        "[Workflow] No nodes connected to Start. Nothing to execute.",
      );
      setRunState("done");
      return;
    }

    const firstNode = findStartNode();
    if (!firstNode) {
      addLog(
        "warn",
        "[Workflow] Start node has no outgoing edge. Flow stopped.",
      );
      setRunState("done");
      return;
    }

    let node: MessageNodeData = firstNode;
    let capturedInput = "";

    while (true) {
      setCurrentNode(node);
      await sleep(500);

      // ── Agent node handling ────────────────────────────────────────────
      if ((node as unknown as { type: string }).type === "agent") {
        const agentNode = node as unknown as { id: string; agentId?: string };
        const agentId = agentNode.agentId;

        if (!agentId || !agentsMap[agentId]) {
          addLog(
            "warn",
            `[Agent Node] No agent configured on node ${node.id.slice(0, 8)}… — skipping.`,
          );
          addChat({
            role: "bot",
            text: "⚠️ This node has no agent selected. Please select an agent in the canvas.",
          });
          const { node: nextAgentNode, deadEnd } = findNextNode(
            node.id,
            undefined,
          );
          if (deadEnd || !nextAgentNode) break;
          node = nextAgentNode;
          continue;
        } else {
          const ag = agentsMap[agentId];
          addLog(
            "info",
            `[Agent Node] Running agent: "${ag.title}" (${ag.model})`,
          );
          addLog(
            "log",
            `[Agent Node] Instructions: ${ag.instructions.slice(0, 120) || "(none)"}${ag.instructions.length > 120 ? "…" : ""}`,
          );

          // ── Check for a pre-captured reply from a connected Message block ────
          const precaptured = workflowMemoryRef.current[node.id];
          if (precaptured) {
            delete workflowMemoryRef.current[node.id];
            addLog(
              "info",
              `[Agent Node] Using captured reply from Message block: "${precaptured}"`,
            );
            capturedInput = precaptured;
          }

          let lastMsgId: string | null = null;

          if (capturedInput) {
            // ── Auto-detect exit condition from captured input ───────────────────
            if (ag.exitConditions && ag.exitConditions.length > 0) {
              addLog("log", `[Exit Check] Checking if captured input matches any exit condition…`);
              const matchedId = await matchExitCondition(capturedInput, ag.exitConditions);
              if (matchedId) {
                const matchedEc = ag.exitConditions.find((ec) => ec.id === matchedId);
                addLog("info", `[Agent Node] Auto-triggered exit condition from captured input: "${matchedEc?.description ?? matchedId}"`);
                const { node: nextNode, deadEnd } = findNextNode(node.id, matchedId);
                capturedInput = ""; // Consume it
                if (deadEnd || !nextNode) {
                  addLog("warn", `[Flow] No edge connected to this exit condition. Flow stopped.`);
                  addChat({ role: "bot", text: "⚠️ No connected path for this exit condition. Flow ended." });
                  break;
                } else {
                  node = nextNode;
                  continue;
                }
              }
            }

            addLog(
              "info",
              `[Agent Node] Auto-sending captured reply to API: "${capturedInput}"`,
            );
            // Show processing indicator
            lastMsgId = addChat({
              role: "bot",
              text: `🤖 Processing your reply…`,
            });

            // Auto-send the captured reply directly to the API (no user wait)
            const inputToSend = capturedInput;
            capturedInput = ""; // Consume it
            addLog(
              "log",
              `[API] Calling /api/chat/agent with agentId=${agentId} (captured reply)`,
            );
            try {
              const agentRes: Response = await fetch("/api/chat/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  agentId,
                  messages: [{ role: "user", content: inputToSend }],
                  sessionId: sessionIdRef.current ?? undefined,
                }),
              });

              if (!agentRes.ok) {
                const errText = await agentRes.text();
                addLog("error", `[API Error] ${agentRes.status}: ${errText}`);
                lastMsgId = addChat({
                  role: "bot",
                  text: `⚠️ API Error: ${errText}`,
                });
              } else {
                const data: {
                  role: string;
                  content: string;
                  sessionId?: string;
                } = await agentRes.json();
                if (data.sessionId && !sessionIdRef.current) {
                  sessionIdRef.current = data.sessionId;
                  addLog(
                    "info",
                    `[Session] Created session: ${data.sessionId.slice(0, 8)}…`,
                  );
                }
                const rawReply = data.content || "(empty response)";
                const strippedReply = stripThinking(rawReply);
                const {
                  text: introText,
                  closingText: rawClosing,
                  productCards,
                } = parseProductDisplay(strippedReply);
                const textToProcess = rawClosing ? rawClosing : introText;
                const afterDetails = textToProcess
                  .replace(/<details_table>[\s\S]*?<\/details_table>/g, "")
                  .trim();
                const { text: finalClosingText, quickReplies } =
                  parseQuickReplies(afterDetails);
                const finalIntroText = rawClosing
                  ? introText
                  : finalClosingText;
                lastMsgId = addChat({
                  role: "bot",
                  text: finalIntroText,
                  closingText: rawClosing ? finalClosingText : undefined,
                  quickReplies:
                    quickReplies.length > 0 ? quickReplies : undefined,
                  productCards:
                    productCards.length > 0 ? productCards : undefined,
                });
              }
            } catch (error: any) {
              addLog("error", `[Network Error] ${error.message}`);
              lastMsgId = addChat({
                role: "bot",
                text: `⚠️ Network Error: ${error.message}`,
              });
            }
          } else {
            lastMsgId = addChat({
              role: "bot",
              text: `🤖 Agent "${ag.title}" is active. Type a message to chat!`,
            });
          }

          let agentExited = false;
          // Note: we no longer use the local `conversation` array for LLM context.
          // History is stored in and fetched from Supabase by the backend.
          const conversation: {
            role: "user" | "assistant";
            content: string;
          }[] = [];

          while (true) {
            setRunState("waiting");
            waitingMsgIdRef.current = lastMsgId;

            const rawPayload = await new Promise<string>((resolve) => {
              waitResolveRef.current = resolve;
            });

            waitingMsgIdRef.current = null;
            setRunState("running");

            const isButtonPayload = rawPayload.startsWith("BTN::");
            const [userLabel] = isButtonPayload
              ? rawPayload.slice(5).split("::")
              : [rawPayload];

            addLog("log", `[User → Agent] ${userLabel}`);
            await sleep(400);

            // ── Auto-detect exit condition from user message ───────────────────
            if (ag.exitConditions && ag.exitConditions.length > 0) {
              addLog(
                "log",
                `[Exit Check] Checking if user message matches any exit condition…`,
              );
              const matchedId = await matchExitCondition(
                userLabel,
                ag.exitConditions,
              );
              if (matchedId) {
                const matchedEc = ag.exitConditions.find(
                  (ec) => ec.id === matchedId,
                );
                addLog(
                  "info",
                  `[Agent Node] Auto-triggered exit condition: "${matchedEc?.description ?? matchedId}"`,
                );
                const { node: nextNode, deadEnd } = findNextNode(
                  node.id,
                  matchedId,
                );
                if (deadEnd || !nextNode) {
                  addLog(
                    "warn",
                    `[Flow] No edge connected to this exit condition. Flow stopped.`,
                  );
                  addChat({
                    role: "bot",
                    text: "⚠️ No connected path for this exit condition. Flow ended.",
                  });
                  agentExited = true;
                  node = null as any;
                  break;
                } else {
                  node = nextNode;
                  agentExited = true;
                  break;
                }
              }
            }

            {
              // Call real API
              conversation.push({ role: "user", content: userLabel });
              addLog(
                "log",
                `[API] Calling /api/chat/agent with agentId=${agentId}`,
              );
              try {
                const agentRes: Response = await fetch("/api/chat/agent", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    agentId,
                    messages: [{ role: "user", content: userLabel }],
                    sessionId: sessionIdRef.current ?? undefined,
                  }),
                });

                if (!agentRes.ok) {
                  const errText = await agentRes.text();
                  addLog("error", `[API Error] ${agentRes.status}: ${errText}`);
                  lastMsgId = addChat({
                    role: "bot",
                    text: `⚠️ API Error: ${errText}`,
                  });
                } else {
                  const data: {
                    role: string;
                    content: string;
                    sessionId?: string;
                  } = await agentRes.json();
                  // Capture sessionId from first response
                  if (data.sessionId && !sessionIdRef.current) {
                    sessionIdRef.current = data.sessionId;
                    addLog(
                      "info",
                      `[Session] Created session: ${data.sessionId.slice(0, 8)}…`,
                    );
                  }
                  const rawReply = data.content || "(empty response)";

                  // 0. Strip internal <thinking> block — never shown to user
                  const strippedReply = stripThinking(rawReply);
                  // 1. Extract product cards
                  const {
                    text: introText,
                    closingText: rawClosing,
                    productCards,
                  } = parseProductDisplay(strippedReply);
                  // 2. Strip any <details_table> block (we build table from productCards, not from this)
                  const textToProcess = rawClosing ? rawClosing : introText;
                  const afterDetails = textToProcess
                    .replace(/<details_table>[\s\S]*?<\/details_table>/g, "")
                    .trim();
                  // 3. Extract quick replies
                  const { text: finalClosingText, quickReplies } =
                    parseQuickReplies(afterDetails);

                  const finalIntroText = rawClosing
                    ? introText
                    : finalClosingText;

                  // Store the original full response in conversation history for context
                  conversation.push({ role: "assistant", content: rawReply });

                  lastMsgId = addChat({
                    role: "bot",
                    text: finalIntroText,
                    closingText: rawClosing ? finalClosingText : undefined,
                    quickReplies:
                      quickReplies.length > 0 ? quickReplies : undefined,
                    productCards:
                      productCards.length > 0 ? productCards : undefined,
                  });
                }
              } catch (error: any) {
                addLog("error", `[Network Error] ${error.message}`);
                lastMsgId = addChat({
                  role: "bot",
                  text: `⚠️ Network Error: ${error.message}`,
                });
              }
            }
          }

          if (agentExited) {
            if (!node) break;
            continue;
          }
        }
      }

      // ── Message node handling ─────────────────────────────────────────

      const text = node.variants[0]?.trim() || "(empty message)";
      await sleep(400);
      addLog("log", `[Message] Sending: "${text}"`);

      const hasButtons = !!(node.buttons && node.buttons.length > 0);
      const msgId = addChat({
        role: "bot",
        text,
        buttons: hasButtons ? node.buttons : undefined,
      });

      if (node.waitForInput || hasButtons) {
        await sleep(300);
        addLog(
          "log",
          `[Node] Pausing — ${hasButtons ? "buttons present" : "waitForInput: true"}`,
        );
        addLog("info", "[Flow] Waiting for user input...");
        setRunState("waiting");
        waitingMsgIdRef.current = msgId;

        const rawPayload = await new Promise<string>((resolve) => {
          waitResolveRef.current = resolve;
        });

        waitingMsgIdRef.current = null;
        setRunState("running");

        // Decode: button clicks prefixed with "BTN::"
        const isButtonPayload = rawPayload.startsWith("BTN::");
        const [userLabel, clickedButtonId] = isButtonPayload
          ? rawPayload.slice(5).split("::") // ["label", "buttonId"]
          : [rawPayload, undefined];

        addLog(
          "log",
          `[Input] Received: "${userLabel}"${clickedButtonId ? ` (button: ${clickedButtonId})` : ""}`,
        );
        addLog("log", "[Node] Resuming flow...");

        if (!isButtonPayload) {
          capturedInput = userLabel;

          // ── Save entire reply: route captured text to the connected Agent node ──
          const msgNodeTyped = node as MessageNodeData;
          if (msgNodeTyped.saveEntireReply) {
            // Find the body-port outgoing edge (no sourceHandleId) from this Message
            const outEdge = edges.find(
              (e) => e.from === node.id && !e.sourceHandleId,
            );
            if (outEdge) {
              const targetNode = nodes.find((n) => n.id === outEdge.to);
              if (
                targetNode &&
                (targetNode as unknown as { type: string }).type === "agent"
              ) {
                workflowMemoryRef.current[targetNode.id] = userLabel;
                addLog(
                  "info",
                  `[Capture] Saved reply → agent node ${targetNode.id.slice(0, 8)}…: "${userLabel}"`,
                );
              }
            }
          }
        } else if (isButtonPayload && clickedButtonId) {
          // ── Button → Agent context routing ────────────────────────────────────
          // When a button's handle edge leads to an Agent node, ALWAYS route the
          // button label as the agent's first message — no toggle required.
          const msgNodeTyped = node as MessageNodeData;
          const clickedBtn = msgNodeTyped.buttons?.find(
            (b) => b.id === clickedButtonId,
          );
          // Find the button-specific outgoing edge (sourceHandleId === buttonId)
          const btnEdge = edges.find(
            (e) => e.from === node.id && e.sourceHandleId === clickedButtonId,
          );
          if (btnEdge) {
            const targetNode = nodes.find((n) => n.id === btnEdge.to);
            if (
              targetNode &&
              (targetNode as unknown as { type: string }).type === "agent"
            ) {
              const label = clickedBtn?.label ?? userLabel;
              workflowMemoryRef.current[targetNode.id] = label;
              addLog(
                "info",
                `[Capture] Button "${label}" → agent node ${targetNode.id.slice(0, 8)}…`,
              );
            }
          }
        }

        await sleep(300);

        const { node: nextNode, deadEnd } = findNextNode(
          node.id,
          clickedButtonId,
        );

        if (deadEnd || !nextNode) {
          const handle = clickedButtonId ?? "default";
          addLog(
            "warn",
            `[Flow] No edge from "${node.id.slice(0, 8)}..." for handle "${handle}". Flow stopped.`,
          );
          addChat({
            role: "bot",
            text: "⚠️ No connected path for this choice. Flow ended.",
          });
          setRunState("done");
          setCurrentNode(null);
          return;
        }

        node = nextNode;
        continue;
      }

      // No input needed — auto-advance via body port
      const { node: nextNode, deadEnd } = findNextNode(node.id, undefined);
      if (deadEnd || !nextNode) break;
      node = nextNode;
    }

    await sleep(400);
    addLog("log", "[Workflow] Reached end of flow.");
    addLog("info", "[Workflow] Execution complete ✓");
    setRunState("done");
    setCurrentNode(null);
  }, [nodes, edges, addLog, addChat, findStartNode, findNextNode]);

  // ── Auto-start on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    runWorkflow();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle free-text send ───────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    setChat((prev) => [...prev, { id: makeId(), role: "user", text }]);

    if (waitResolveRef.current) {
      waitResolveRef.current(text);
      waitResolveRef.current = null;
    } else {
      addLog(
        "warn",
        `[Input] Message received but no node is waiting: "${text}"`,
      );
    }
  }, [inputValue, addLog]);

  // ── Handle button click (canvas-flow routing buttons) ──────────────────────
  /**
   * Encodes label + button id as "BTN::<label>::<btnId>" so the execution
   * loop can do strict sourceHandleId matching (YES vs NO route correctly).
   */
  const handleButtonClick = useCallback(
    (label: string, btnId: string, msgId: string) => {
      if (runState !== "waiting") return;

      // Lock the button row so it can't be clicked again
      setChat((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, chosenButtonId: btnId } : m)),
      );

      // Show user bubble with the chosen label
      setChat((prev) => [...prev, { id: makeId(), role: "user", text: label }]);

      if (waitResolveRef.current) {
        waitResolveRef.current(`BTN::${label}::${btnId}`);
        waitResolveRef.current = null;
      }
    },
    [runState],
  );

  // ── Handle quick reply click (AI-generated pill buttons) ────────────────────
  /**
   * Quick replies are plain-text shortcuts — they behave exactly like the user
   * typing and sending that text. They do NOT use the BTN:: routing protocol
   * so they never interfere with canvas flow-control edges.
   */
  const handleQuickReply = useCallback(
    (text: string) => {
      if (runState !== "waiting") return;
      // Dismiss quick replies on the triggering message so they don't replay
      setChat((prev) =>
        prev.map((m) =>
          m.quickReplies ? { ...m, quickReplies: undefined } : m,
        ),
      );
      // Add user bubble
      setChat((prev) => [...prev, { id: makeId(), role: "user", text }]);
      // Feed the text into the waiting execution loop (plain, no BTN:: prefix)
      if (waitResolveRef.current) {
        waitResolveRef.current(text);
        waitResolveRef.current = null;
      }
    },
    [runState],
  );

  const handleRestart = useCallback(() => {
    waitResolveRef.current = null;
    waitingMsgIdRef.current = null;
    hasStartedRef.current = false;
    setCurrentNode(null);
    setRunState("idle");
    setTimeout(() => {
      hasStartedRef.current = true;
      runWorkflow();
    }, 0);
  }, [runWorkflow]);

  const filteredLogs = logs.filter((l) => {
    const matchesFilter = logFilter === "all" || l.level === logFilter;
    const matchesSearch =
      searchQuery === "" ||
      l.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const levelColor = {
    log: "text-gray-700",
    info: "text-blue-600",
    warn: "text-amber-500",
    error: "text-red-600",
  };

  const levelBg = {
    log: "",
    info: "bg-blue-50",
    warn: "bg-amber-50",
    error: "bg-red-50",
  };

  const levelBadge = {
    log: "bg-gray-100 text-gray-600",
    info: "bg-blue-100 text-blue-700",
    warn: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200">
        {/* ── Left: Debug Logs ────────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col border-r border-gray-200">
          {/* Logs Header */}
          <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLogFilter("all")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${logFilter === "all" ? "bg-white shadow-sm text-gray-900 border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
              >
                Logs
              </button>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-xs text-gray-700 placeholder-gray-400 outline-none"
              />
            </div>
            <button className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
              All <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Log entries */}
          <div className="flex-1 overflow-y-auto font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400 font-sans text-sm">
                {runState === "running"
                  ? "Executing workflow..."
                  : "No logs yet. Click Run to start."}
              </div>
            ) : (
              filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-3 border-b border-gray-50 px-4 py-2 ${levelBg[entry.level]}`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${levelBadge[entry.level]}`}
                  >
                    {entry.level === "info"
                      ? "Info"
                      : entry.level === "warn"
                        ? "Warn"
                        : entry.level === "error"
                          ? "Error"
                          : "Log"}
                  </span>
                  <span className="shrink-0 text-gray-400 mt-0.5">
                    {entry.time}
                  </span>
                  <span
                    className={`flex-1 break-all ${levelColor[entry.level]}`}
                  >
                    {entry.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2">
            <div
              className={`h-2 w-2 rounded-full ${runState === "running"
                  ? "bg-blue-500 animate-pulse"
                  : runState === "waiting"
                    ? "bg-amber-500 animate-pulse"
                    : runState === "done"
                      ? "bg-green-500"
                      : "bg-gray-400"
                }`}
            />
            <span className="text-xs text-gray-500">
              {runState === "running"
                ? "Running..."
                : runState === "waiting"
                  ? "Waiting for user input..."
                  : runState === "done"
                    ? `Done — ${logs.length} events logged`
                    : "Idle"}
            </span>
            {currentNode && (
              <span className="ml-auto text-xs text-gray-400 font-mono truncate max-w-[200px]">
                node: {currentNode.id.slice(0, 12)}…
              </span>
            )}
          </div>
        </div>

        {/* ── Right: Widget ────────────────────────────────────────────────────── */}
        <div
          className="flex w-[420px] shrink-0 flex-col overflow-hidden"
          style={{ fontFamily: theme.fontFamily, background: "white" }}
        >

          {/* DYNAMIC HEADER */}
          {widgetTab === "accueil" ? (
            /* Dark greeting header */
            <div style={{ background: theme.headerBg, padding: "20px 24px 24px", minHeight: 158, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 2 }}>
                    <img src="https://cdn.shopify.com/s/files/1/0156/6146/files/Gymshark_Logo_White_200x.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: theme.headerText, letterSpacing: "0.5px" }}>GYMSHARK</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={handleRestart} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 600, color: theme.headerText, lineHeight: 1.25, marginTop: 4 }}>
                Bonjour 👋<br />Comment pouvons-<br />nous vous aider ?
              </div>
            </div>
          ) : (
            /* Light header for Messages / Aide */
            <div style={{ background: "white", padding: "16px 20px", borderBottom: "1px solid #eee", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>
                {widgetTab === "messages" ? "Messages" : "Aide"}
              </span>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                <X className="h-5 w-5" style={{ color: "#aaa" } as React.CSSProperties} />
              </button>
            </div>
          )}

          {/* BODY */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {/* ── ACCUEIL ── */}
            {widgetTab === "accueil" && (
              <div style={{ flex: 1, overflowY: "auto", background: "#f5f5f3", borderRadius: "16px 16px 0 0", padding: "18px 16px 12px", scrollbarWidth: "none" } as React.CSSProperties}>

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

                {/* Message CTA */}
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

            {/* ── MESSAGES ── */}
            {widgetTab === "messages" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {messagesView === "list" ? (
                  /* CONVERSATION LIST */
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px", background: "white", display: "flex", flexDirection: "column" }}>
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
                            {chat.length > 0 ? (chat.find(m => m.role === "bot")?.text?.slice(0, 55) || "إنك أسل المنتجات التي يجدها لك") : "إنك أسل المنتجات التي يجدها لك"}
                          </p>
                        </div>
                      </button>
                    </div>
                    <div style={{ padding: "12px 16px", borderTop: "1px solid #eee", background: "white", flexShrink: 0 }}>
                      <button
                        onClick={() => setMessagesView("chat")}
                        style={{ width: "100%", background: "#1a1a1a", color: "white", borderRadius: 50, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}
                      >
                        Envoyez-nous un message
                        <svg viewBox="0 0 24 24" fill="white" style={{ width: 16, height: 16 }}>
                          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* CHAT VIEW */
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {chat.length === 0 && runState !== "running" && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 24px" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, marginBottom: 16 }}>
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p style={{ fontSize: 14, color: "#888" }}>Aucun message pour l&apos;instant.<br />Écrivez-nous, on répond vite !</p>
                      </div>
                    )}
                    {chat.map((msg) => (
                      <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        {msg.text.trim() && (
                          <div
                            className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${theme.borderRadius === "pill" ? "rounded-full"
                                : theme.borderRadius === "sharp" ? "rounded-sm"
                                  : msg.role === "user" ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"
                              }`}
                            style={msg.role === "user"
                              ? { background: theme.userBubbleBg, color: theme.userBubbleText }
                              : { background: theme.botBubbleBg, color: theme.botBubbleText }
                            }
                          >
                            {msg.text}
                          </div>
                        )}
                        {/* Canvas-flow routing buttons */}
                        {msg.role === "bot" && msg.buttons && msg.buttons.length > 0 && !msg.buttons.every(btn => btn.id.startsWith('ec_')) && (
                          <div className="flex flex-col gap-1.5 w-full max-w-[80%]">
                            {msg.buttons.map((btn) => {
                              const isChosen = msg.chosenButtonId === btn.id
                              const isLocked = !!msg.chosenButtonId
                              const isWaitingOnThis = runState === "waiting" && waitingMsgIdRef.current === msg.id
                              return (
                                <button
                                  key={btn.id}
                                  disabled={isLocked || !isWaitingOnThis}
                                  onClick={() => handleButtonClick(btn.label, btn.id, msg.id)}
                                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium text-left transition-all duration-150 ${isChosen ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                                      : isLocked ? "border-gray-200 bg-gray-50 text-gray-400 cursor-default"
                                        : isWaitingOnThis ? "border-blue-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-400 cursor-pointer"
                                          : "border-gray-200 bg-gray-50 text-gray-400 cursor-default"
                                    }`}
                                >
                                  <MousePointerClick className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                  {btn.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                        {/* Quick reply pills */}
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
                        {/* Product cards */}
                        {msg.role === "bot" && msg.productCards && msg.productCards.length > 0 && (
                          <div className="w-full mt-1 flex flex-col gap-3">
                            <ProductCarousel products={msg.productCards} />
                            <div dir="rtl" className="flex flex-col gap-3 rounded-xl bg-[#f8f9fa] border border-gray-100 p-3.5 text-sm text-gray-800 shadow-sm">
                              <p className="font-medium text-gray-700">هاهي التفاصيل ديال كل {msg.productCards[0]?.category || "منتج"}:</p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-right text-[11px] md:text-xs">
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
                                    {msg.productCards.map((p, idx) => (
                                      <tr key={idx} className="border-b border-gray-100 last:border-0 text-gray-700">
                                        <td className="py-2.5 px-1 align-top"><div className="flex gap-1.5 items-start"><span className="font-semibold text-gray-400">{idx + 1}</span><span className="line-clamp-3">{p.name}</span></div></td>
                                        <td className="py-2.5 px-1 align-top text-center font-medium"><div className="flex items-center justify-center gap-1">{p.color || "-"}{p.color?.toLowerCase() === 'bordeaux' && <span className="text-red-500 text-[10px]">🔴</span>}{p.color?.toLowerCase() === 'beige' && <span className="text-amber-700 text-[10px]">🟤</span>}{p.color?.toLowerCase() === 'bleu' && <span className="text-blue-500 text-[10px]">🔵</span>}{p.color?.toLowerCase() === 'kaki' && <span className="text-green-500 text-[10px]">🟢</span>}</div></td>
                                        <td className="py-2.5 px-1 align-top text-center text-gray-600">{p.fabric || "-"}</td>
                                        <td className="py-2.5 px-1 align-top text-center text-gray-600">{p.category || "Boxy Fit"}</td>
                                        <td className="py-2.5 px-1 align-top text-center font-semibold whitespace-nowrap font-sans text-gray-900">{p.price}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <p className="text-xs font-medium text-gray-500">S, M, L كلها متوفرة بمقاسات 👌</p>
                              {msg.closingText && <p className="text-sm font-medium text-gray-800 mt-1">{msg.closingText}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Typing indicator */}
                    {runState === "running" && (
                      <div className="flex justify-start">
                        <div
                          className={`flex gap-1 px-4 py-3 ${theme.borderRadius === "pill" ? "rounded-full" : theme.borderRadius === "sharp" ? "rounded-sm" : "rounded-2xl rounded-bl-sm"
                            }`}
                          style={{ background: theme.botBubbleBg }}
                        >
                          <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.botBubbleText, opacity: 0.5, animationDelay: "0ms" }} />
                          <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.botBubbleText, opacity: 0.5, animationDelay: "150ms" }} />
                          <span className="h-2 w-2 rounded-full animate-bounce" style={{ background: theme.botBubbleText, opacity: 0.5, animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                {/* BOTTOM AREA */}
                {messagesView === "list" ? (
                  /* "Envoyez-nous un message" pill button */
                  <div style={{ padding: "12px 16px", borderTop: "1px solid #eee", background: "white", flexShrink: 0 }}>
                    <button
                      onClick={() => setMessagesView("chat")}
                      style={{ width: "100%", background: "#1a1a1a", color: "white", borderRadius: 50, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}
                    >
                      Envoyez-nous un message
                      <svg viewBox="0 0 24 24" fill="white" style={{ width: 16, height: 16 }}>
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  /* Chat input */
                  (() => {
                    const waitingMsg = chat.find(m => m.id === waitingMsgIdRef.current)
                    const isAgentNode = currentNode && (currentNode as unknown as { type: string }).type === 'agent'
                    const buttonOnly = !isAgentNode && waitingMsg?.buttons && waitingMsg.buttons.length > 0
                    return (
                      <div style={{ background: "white", borderTop: "1px solid #eee", padding: "10px 14px", flexShrink: 0 }}>
                        {buttonOnly ? (
                          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs" style={{ borderColor: theme.inputBorder, color: theme.inputText, opacity: 0.6 }}>
                            <MousePointerClick className="h-3.5 w-3.5" />
                            Choose a button above to continue
                          </div>
                        ) : (
                          <div
                            className={`flex items-center gap-2 px-4 py-2.5 ${theme.borderRadius === "pill" ? "rounded-full" : theme.borderRadius === "sharp" ? "rounded-sm" : "rounded-xl"
                              }`}
                            style={{ border: `1px solid ${theme.inputBorder}`, background: theme.inputBg }}
                          >
                            <input
                              type="text"
                              placeholder={runState === "waiting" ? "Écrivez votre message..." : "Message..."}
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSend()}
                              disabled={runState !== "waiting"}
                              className="flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
                              style={{ color: theme.inputText }}
                            />
                            <button
                              onClick={handleSend}
                              disabled={runState !== "waiting" || !inputValue.trim()}
                              className={`flex h-7 w-7 shrink-0 items-center justify-center text-white transition disabled:opacity-30 ${theme.borderRadius === "pill" ? "rounded-full" : theme.borderRadius === "sharp" ? "rounded-sm" : "rounded-lg"
                                }`}
                              style={{ background: theme.sendBtnBg }}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()
                )}
              </div>
            )}

            {/* ── AIDE ── */}
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

          </div>{/* end BODY */}

          {/* BOTTOM TAB BAR */}
          <div style={{ display: "flex", background: "white", borderTop: "1px solid #eee", flexShrink: 0, padding: "6px 0 10px", alignItems: "center" }}>
            {[
              {
                id: "accueil" as const, label: "Accueil",
                svg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
              },
              {
                id: "messages" as const, label: "Messages",
                svg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
              },
              {
                id: "aide" as const, label: "Aide",
                svg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ),
              },
            ].map(tab => {
              const isActive = widgetTab === tab.id
              const hasBadge = tab.id === "messages" && chat.length > 0 && widgetTab !== "messages"
              return (
                <button
                  key={tab.id}
                  onClick={() => { setWidgetTab(tab.id); if (tab.id === "messages") setMessagesView("list") }}
                  className="transition-colors hover:bg-gray-50 cursor-pointer"
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: "none", color: isActive ? "#111" : "#aaa", padding: "6px 0", borderRadius: 8, margin: "0 4px", position: "relative" }}
                >
                  {tab.svg}
                  <span style={{ fontSize: 10, fontWeight: 500 }}>{tab.label}</span>
                  {hasBadge && (
                    <span style={{ position: "absolute", top: 4, right: "calc(50% - 12px)", width: 8, height: 8, borderRadius: "50%", background: theme.sendBtnBg }} />
                  )}
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-6 top-6 text-white/50 hover:text-white"
      >
        <X className="h-8 w-8" />
      </button>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
