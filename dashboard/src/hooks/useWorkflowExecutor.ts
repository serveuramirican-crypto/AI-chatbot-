import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { loadWorkflow } from '@/lib/workflowStore';
import { AgentConfig } from '@/types/agent';
import {
  parseProductDisplay,
  parseQuickReplies,
  stripThinking,
  matchExitCondition,
  ProductItem,
} from '@/lib/workflowHelpers';
import { rowToAgentConfig } from '@/lib/agentStore';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "bot" | "user" | "admin";
  text: string;
  buttons?: { id: string; label: string }[];
  chosenButtonId?: string;
  quickReplies?: string[];
  productCards?: ProductItem[];
  closingText?: string;
  product?: any;
  suggestedButtons?: string[];
  isCarousel?: boolean;
}

type RunState = "idle" | "running" | "waiting" | "done";

function makeId() {
  return Math.random().toString(36).slice(2);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * useWorkflowExecutor
 *
 * Mirrors the RunModal execution engine exactly so the website chat widget
 * produces the same conversation as the canvas-flow "Run" modal.
 *
 * Key parity points with RunModal:
 * - globalContextRef array accumulates all user selections and is passed as
 *   `userContext` to every /api/chat/agent call.
 * - sessionId returned from the first agent response is captured and reused.
 * - workflowMemoryRef routes captured Message-node replies to the correct
 *   connected Agent node.
 * - Fresh session on every widget load (no localStorage reuse).
 */
export function useWorkflowExecutor(projectId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runState, setRunState] = useState<RunState>("idle");
  const [loading, setLoading] = useState(false);
  const [agentsMap, setAgentsMap] = useState<Record<string, AgentConfig>>({});

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  const [isTakenOver, setIsTakenOver] = useState(false);
  const isTakenOverRef = useRef(false);

  // Persistent DB session for admin takeover
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  const dbSessionIdRef = useRef<string | null>(null);

  // Agent API session (returned from /api/chat/agent first response)
  const agentSessionIdRef = useRef<string | null>(null);

  // Execution-loop signal
  const waitResolveRef = useRef<((val: string) => void) | null>(null);
  const waitingMsgIdRef = useRef<string | null>(null);

  // RunModal-identical context & memory refs
  const globalContextRef = useRef<string[]>([]);
  const globalVariablesRef = useRef<Record<string, string>>({});
  const workflowMemoryRef = useRef<Record<string, string>>({});

  const hasStartedRef = useRef(false);

  // ── Initialize DB session (always fresh per page load) ─────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const freshId = crypto.randomUUID();
      setDbSessionId(freshId);
      dbSessionIdRef.current = freshId;
    }
  }, []);

  // ── Create Supabase session + realtime subscriptions ───────────────────────
  useEffect(() => {
    const initSession = async () => {
      const sId = dbSessionIdRef.current;
      if (!sId) return;

      const shortId = sId.slice(0, 5);
      const { error: sessError } = await supabase
        .from('chat_sessions')
        .upsert({
          id: sId,
          agent_id: 'agent_1782558058884_2og9p',
          user_name: `Visitor-${shortId}`,
          is_taken_over: false,
          last_interaction: new Date().toISOString()
        }, { onConflict: 'id' });

      if (sessError) {
        console.error('[useWorkflowExecutor] Failed to initialize chat_session in Supabase:', sessError);
      }

      // Realtime: admin messages + takeover flag
      const channel = supabase.channel(`session_${sId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public',
          table: 'chat_messages', filter: `session_id=eq.${sId}`
        }, (payload) => {
          const newMsg = payload.new;
          if (newMsg.role !== 'admin') return; // Ignore locally created agent/user messages
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, { id: newMsg.id, role: newMsg.role as any, text: newMsg.content, productCards: newMsg.products }];
          });
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public',
          table: 'chat_sessions', filter: `id=eq.${sId}`
        }, (payload) => {
          const updatedSess = payload.new;
          setIsTakenOver(updatedSess.is_taken_over);
          isTakenOverRef.current = updatedSess.is_taken_over;
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    if (dbSessionId) initSession();
  }, [dbSessionId]);

  // ── Load published workflow + agents ───────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      let targetProjectId = projectId;

      if (!targetProjectId || targetProjectId === 'default') {
        // 1st preference: find the most recently published workflow snapshot
        const { data: publishedWfs } = await supabase
          .from('workflows')
          .select('id, updated_at')
          .like('id', '%\\_published%')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (publishedWfs && publishedWfs.length > 0) {
          // Strip the "_published" suffix to get the base workflow id
          const baseId = publishedWfs[0].id.replace(/(_published)+$/, '');
          targetProjectId = baseId;
          console.log('[useWorkflowExecutor] Resolved "default" → latest published workflow:', baseId);
        } else {
          // Fallback: no published snapshots exist — load the most recently saved draft
          const { data: wfs } = await supabase
            .from('workflows')
            .select('id')
            .not('id', 'like', '%\\_published%')
            .order('updated_at', { ascending: false })
            .limit(1);
          if (wfs && wfs.length > 0) {
            targetProjectId = wfs[0].id;
            console.log('[useWorkflowExecutor] No published workflow found — using latest draft:', targetProjectId);
          } else return;
        }
      }

      try {
        // Always prefer the _published snapshot (what Publish button creates)
        let row = targetProjectId ? await loadWorkflow(`${targetProjectId}_published`) : null;
        if (!row && targetProjectId) {
          console.warn('[useWorkflowExecutor] No published snapshot for', targetProjectId, '— loading draft instead.');
          row = await loadWorkflow(targetProjectId as string);
        }

        // Ultimate fallback if specified targetProjectId does not exist in DB
        if (!row) {
          console.log('[useWorkflowExecutor] Target project ID not found in DB — falling back to latest published workflow...');
          const { data: fallbackPublished } = await supabase
            .from('workflows')
            .select('id')
            .like('id', '%\\_published%')
            .order('updated_at', { ascending: false })
            .limit(1);

          if (fallbackPublished && fallbackPublished.length > 0) {
            row = await loadWorkflow(fallbackPublished[0].id);
          } else {
            const { data: fallbackDraft } = await supabase
              .from('workflows')
              .select('id')
              .not('id', 'like', '%\\_published%')
              .order('updated_at', { ascending: false })
              .limit(1);
            if (fallbackDraft && fallbackDraft.length > 0) {
              row = await loadWorkflow(fallbackDraft[0].id);
            }
          }
        }

        if (row) {
          setNodes(row.nodes as any[] || []);
          setEdges(row.edges as any[] || []);
        }

        const { data: agentsData } = await supabase.from('agents').select('*');
        if (agentsData) {
          const map: Record<string, AgentConfig> = {};
          for (const a of agentsData) map[a.id] = rowToAgentConfig(a);
          setAgentsMap(map);
        }
      } catch (err) {
        console.error("Failed to load workflow data:", err);
      }
    }
    loadData();
  }, [projectId]);

  // ── Save bot messages to Supabase ──────────────────────────────────────────
  const saveBotMessage = async (id: string, text: string, products?: any[], quickReplies?: string[], buttons?: { id: string; label: string }[]) => {
    const sId = dbSessionIdRef.current;
    if (!sId) return;

    let contentToSave = text;
    if (quickReplies && quickReplies.length > 0) {
      contentToSave += `\n\n<options>${JSON.stringify(quickReplies)}</options>`;
    } else if (buttons && buttons.length > 0) {
      const btnTags = buttons.map(b => `[BUTTON]${b.label}[/BUTTON]`).join(' ');
      contentToSave += `\n\n${btnTags}`;
    }

    await supabase.from('chat_messages').insert({
      id, session_id: sId, role: 'agent', content: contentToSave, products: products || null,
    });
  };

  const addChat = useCallback((msg: Omit<ChatMessage, "id">) => {
    const id = crypto.randomUUID();
    setMessages(prev => [...prev, { ...msg, id }]);
    if (msg.role === 'bot') saveBotMessage(id, msg.text, msg.productCards, msg.quickReplies, msg.buttons);
    return id;
  }, []);

  // ── Graph helpers (identical to RunModal) ──────────────────────────────────
  const findStartNode = useCallback(() => {
    const startEdge = edges.find(e => e.from === "start" && !e.sourceHandleId);
    if (!startEdge) return null;
    return nodes.find(n => n.id === startEdge.to) ?? null;
  }, [edges, nodes]);

  const findNextNode = useCallback((fromNodeId: string, clickedButtonId?: string) => {
    let matchingEdge: any;
    if (clickedButtonId) {
      matchingEdge = edges.find(e => e.from === fromNodeId && e.sourceHandleId === clickedButtonId);
    } else {
      matchingEdge = edges.find(e => e.from === fromNodeId && !e.sourceHandleId);
    }
    if (!matchingEdge) return { node: null, deadEnd: true };
    if (matchingEdge.to === fromNodeId) return { node: null, deadEnd: true };
    const nextNode = nodes.find(n => n.id === matchingEdge.to) ?? null;
    return { node: nextNode, deadEnd: nextNode === null };
  }, [edges, nodes]);

  // ── Main workflow execution loop (mirrors RunModal exactly) ────────────────
  const runWorkflow = useCallback(async () => {
    setMessages([]);
    setRunState("running");
    setLoading(false);

    // Reset all RunModal-equivalent state
    globalContextRef.current = [];
    globalVariablesRef.current = {};
    workflowMemoryRef.current = {};
    agentSessionIdRef.current = null;

    await sleep(400);

    if (nodes.length === 0) { setRunState("done"); return; }

    const firstNode = findStartNode();
    if (!firstNode) { setRunState("done"); return; }

    let node = firstNode;
    let capturedInput = "";

    while (true) {
      await sleep(500);

      // Pause if admin took over
      if (isTakenOverRef.current) {
        setRunState("waiting");
        await sleep(1000);
        continue;
      }

      // ── Agent Node ──────────────────────────────────────────────────────────
      if (node.type === "agent") {
        const agentId = node.agentId;
        if (!agentId) {
          addChat({ role: "bot", text: "⚠️ No agent assigned to this node. Please select an agent in Canvas Flow." });
          const { node: n, deadEnd } = findNextNode(node.id);
          if (deadEnd || !n) break;
          node = n;
          continue;
        }

        let ag = agentsMap[agentId];
        if (!ag) {
          try {
            const { data: fetchedRow } = await supabase
              .from('agents')
              .select('*')
              .eq('id', agentId)
              .maybeSingle();
            if (fetchedRow) {
              ag = rowToAgentConfig(fetchedRow);
              setAgentsMap(prev => ({ ...prev, [agentId]: ag }));
            }
          } catch (err) {
            console.warn('[useWorkflowExecutor] On-demand agent fetch error:', err);
          }
        }

        if (!ag) {
          ag = {
            id: agentId,
            title: "AI Agent",
            model: "gpt-4o-mini",
            credentialId: null,
            instructions: "",
            tools: [],
            knowledgeBase: { isConfigured: false, documents: [] },
            exitConditions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: "published",
          };
        }

        // Consume pre-captured reply from a connected Message block
        const precaptured = workflowMemoryRef.current[node.id];
        if (precaptured) {
          delete workflowMemoryRef.current[node.id];
          capturedInput = precaptured;
        }

        let lastMsgId: string | null = null;

        if (capturedInput) {
          // Auto-check exit conditions on captured input (RunModal behaviour)
          if (ag.exitConditions && ag.exitConditions.length > 0) {
            const matchedId = await matchExitCondition(capturedInput, ag.exitConditions);
            if (matchedId) {
              const { node: nextNode, deadEnd } = findNextNode(node.id, matchedId);
              capturedInput = "";
              if (deadEnd || !nextNode) break;
              node = nextNode;
              continue;
            }
          }

          setLoading(true);
          const inputToSend = capturedInput;
          capturedInput = "";

          // Build context exactly like RunModal
          const allSelectionsCtx = globalContextRef.current.join(", ");
          const lastCtxEntry = globalContextRef.current.at(-1) || "";
          const alreadyInCtx = lastCtxEntry.toLowerCase().includes(inputToSend.toLowerCase());
          const combinedMsg = allSelectionsCtx
            ? (alreadyInCtx ? allSelectionsCtx : `${allSelectionsCtx}, ${inputToSend}`)
            : inputToSend;

          try {
            const agentRes: Response = await fetch("/api/chat/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentId,
                messages: [{ role: "user", content: combinedMsg }],
                sessionId: agentSessionIdRef.current ?? dbSessionIdRef.current ?? undefined,
                userContext: allSelectionsCtx || undefined,
              }),
            });

            if (agentRes.ok) {
              const data: { content: string; sessionId?: string } = await agentRes.json();
              // Capture session from first agent response
              if (data.sessionId && !agentSessionIdRef.current) {
                agentSessionIdRef.current = data.sessionId;
              }
              const rawReply = data.content || "(empty response)";
              const strippedReply = stripThinking(rawReply);
              const { text: introText, closingText: rawClosing, productCards } = parseProductDisplay(strippedReply);
              const textToProcess = rawClosing ? rawClosing : introText;
              const afterDetails = textToProcess.replace(/<details_table>[\s\S]*?<\/details_table>/g, "").trim();
              const { text: finalClosingText, quickReplies } = parseQuickReplies(afterDetails);
              const finalIntroText = rawClosing ? introText : finalClosingText;

              lastMsgId = addChat({
                role: "bot",
                text: finalIntroText,
                closingText: rawClosing ? finalClosingText : undefined,
                quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
                productCards: productCards.length > 0 ? productCards : undefined,
              });
            } else {
              lastMsgId = addChat({ role: "bot", text: `⚠️ API Error: ${await agentRes.text()}` });
            }
          } catch (err: any) {
            lastMsgId = addChat({ role: "bot", text: `⚠️ Network Error: ${err.message}` });
          } finally {
            setLoading(false);
          }
        } else {
          lastMsgId = addChat({ role: "bot", text: `🤖 Agent "${ag.title}" is active. Type a message to chat!` });
        }

        // ── Agent inner loop (mirrors RunModal inner while(true)) ─────────────
        let agentExited = false;

        while (true) {
          setRunState("waiting");
          waitingMsgIdRef.current = lastMsgId;

          const rawPayload = await new Promise<string>(resolve => {
            waitResolveRef.current = resolve;
          });

          waitingMsgIdRef.current = null;
          setRunState("running");

          const isButtonPayload = rawPayload.startsWith("BTN::");
          const [userLabel] = isButtonPayload ? rawPayload.slice(5).split("::") : [rawPayload];

          // Exit condition check
          if (ag.exitConditions && ag.exitConditions.length > 0) {
            const matchedId = await matchExitCondition(userLabel, ag.exitConditions);
            if (matchedId) {
              const { node: nextNode, deadEnd } = findNextNode(node.id, matchedId);
              if (deadEnd || !nextNode) { agentExited = true; node = null as any; break; }
              node = nextNode;
              agentExited = true;
              break;
            }
          }

          setLoading(true);
          try {
            const agentLoopCtx = globalContextRef.current.length > 0
              ? globalContextRef.current.join("\n")
              : undefined;

            const agentRes = await fetch("/api/chat/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentId,
                messages: [{ role: "user", content: userLabel }],
                sessionId: agentSessionIdRef.current ?? dbSessionIdRef.current ?? undefined,
                userContext: agentLoopCtx,
              }),
            });

            if (agentRes.ok) {
              const data = await agentRes.json();
              if (data.sessionId && !agentSessionIdRef.current) agentSessionIdRef.current = data.sessionId;
              const rawReply = data.content || "(empty response)";
              const strippedReply = stripThinking(rawReply);
              const { text: introText, closingText: rawClosing, productCards } = parseProductDisplay(strippedReply);
              const textToProcess = rawClosing ? rawClosing : introText;
              const afterDetails = textToProcess.replace(/<details_table>[\s\S]*?<\/details_table>/g, "").trim();
              const { text: finalClosingText, quickReplies } = parseQuickReplies(afterDetails);
              const finalIntroText = rawClosing ? introText : finalClosingText;

              lastMsgId = addChat({
                role: "bot",
                text: finalIntroText,
                closingText: rawClosing ? finalClosingText : undefined,
                quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
                productCards: productCards.length > 0 ? productCards : undefined,
              });
            } else {
              lastMsgId = addChat({ role: "bot", text: `⚠️ API Error: ${await agentRes.text()}` });
            }
          } catch (err: any) {
            lastMsgId = addChat({ role: "bot", text: `⚠️ Network Error: ${err.message}` });
          } finally {
            setLoading(false);
          }
        }

        if (agentExited) { if (!node) break; continue; }
      }

      // ── Carousel Node ────────────────────────────────────────────────────────
      if (node.type === 'carousel') {
        await sleep(400);
        const productCards: ProductItem[] = (node.cards || []).map((card: any) => ({
          name: card.title || 'Untitled', description: card.description || '',
          image_url: card.imageUrl || '', link: '#', buttons: card.buttons || [],
          price: '', image: '',
        }));
        const allButtons = (node.cards || []).flatMap((c: any) => c.buttons || []);
        const hasButtons = allButtons.length > 0;

        const msgId = addChat({
          role: "bot", text: "",
          productCards: productCards.length > 0 ? productCards : undefined,
          buttons: hasButtons ? allButtons : undefined,
          isCarousel: true,
        });

        if (hasButtons) {
          setRunState("waiting");
          waitingMsgIdRef.current = msgId;
          const rawPayload = await new Promise<string>(resolve => { waitResolveRef.current = resolve; });
          waitingMsgIdRef.current = null;
          setRunState("running");

          const isButtonPayload = rawPayload.startsWith("BTN::");
          const [, clickedButtonId] = isButtonPayload ? rawPayload.slice(5).split("::") : [rawPayload, undefined];
          if (clickedButtonId) {
            const nextEdge = edges.find(e => e.from === node.id && e.sourceHandleId === clickedButtonId);
            if (nextEdge) { node = nodes.find(n => n.id === nextEdge.to); continue; }
          }
        }
        break;
      }

      // ── Message Node (mirrors RunModal message handling exactly) ─────────────
      if (node.type === "message" || !node.type) {
        const text = node.variants?.[0]?.trim() || "(empty message)";
        await sleep(400);

        const hasButtons = !!(node.buttons && node.buttons.length > 0);
        const msgId = addChat({ role: "bot", text, buttons: hasButtons ? node.buttons : undefined });

        if (node.waitForInput || hasButtons) {
          setRunState("waiting");
          waitingMsgIdRef.current = msgId;

          const rawPayload = await new Promise<string>(resolve => {
            waitResolveRef.current = resolve;
          });

          waitingMsgIdRef.current = null;
          setRunState("running");

          const isButtonPayload = rawPayload.startsWith("BTN::");
          const [userLabel, clickedButtonId] = isButtonPayload
            ? rawPayload.slice(5).split("::")
            : [rawPayload, undefined];

          if (!isButtonPayload) {
            capturedInput = userLabel;

            // saveEntireReply: route captured text to connected Agent node (RunModal parity)
            if (node.saveEntireReply) {
              const varName = node.captureVariable || "last_utterance";
              globalVariablesRef.current[varName] = userLabel;
              globalContextRef.current.push(userLabel);

              const outEdge = edges.find(e => e.from === node.id && !e.sourceHandleId);
              if (outEdge) {
                const targetNode = nodes.find(n => n.id === outEdge.to);
                if (targetNode && targetNode.type === "agent") {
                  workflowMemoryRef.current[targetNode.id] = userLabel;
                }
              }
            } else {
              globalContextRef.current.push(userLabel);
            }
          } else if (isButtonPayload && clickedButtonId) {
            const clickedBtn = node.buttons?.find((b: any) => b.id === clickedButtonId);
            const label = clickedBtn?.label ?? userLabel;
            globalContextRef.current.push(label);

            const btnEdge = edges.find(e => e.from === node.id && e.sourceHandleId === clickedButtonId);
            if (btnEdge) {
              const targetNode = nodes.find(n => n.id === btnEdge.to);
              if (targetNode && targetNode.type === "agent") {
                workflowMemoryRef.current[targetNode.id] = label;
              }
            }
          }

          await sleep(300);
          const { node: nextNode, deadEnd } = findNextNode(node.id, clickedButtonId);
          if (deadEnd || !nextNode) { setRunState("done"); return; }
          node = nextNode;
          continue;
        }
      }

      // Auto-advance
      const { node: nextNode, deadEnd } = findNextNode(node.id);
      if (deadEnd || !nextNode) break;
      node = nextNode;
    }

    setRunState("done");
  }, [nodes, edges, agentsMap, addChat, findStartNode, findNextNode]);

  // ── Auto-start when nodes load ─────────────────────────────────────────────
  useEffect(() => {
    if (nodes.length > 0 && !hasStartedRef.current && dbSessionId) {
      hasStartedRef.current = true;
      runWorkflow();
    }
  }, [nodes, runWorkflow, dbSessionId]);

  // ── Direct AI fallback when no workflow step is waiting ─────────────────────
  const sendDirectAIMessage = useCallback(async (text: string) => {
    const sId = dbSessionIdRef.current;
    if (!sId) return;

    setLoading(true);
    try {
      const agentIds = Object.keys(agentsMap);
      const agentId = agentIds.length > 0 ? agentIds[0] : 'agent_1782558058884_2og9p';
      const allSelectionsCtx = globalContextRef.current.join(", ");

      const agentRes = await fetch("/api/chat/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: [{ role: "user", content: text }],
          sessionId: sId,
          userContext: allSelectionsCtx || undefined,
        }),
      });

      if (agentRes.ok) {
        const data: { content: string; sessionId?: string } = await agentRes.json();
        const rawReply = data.content || "(empty response)";
        const strippedReply = stripThinking(rawReply);
        const { text: introText, closingText: rawClosing, productCards } = parseProductDisplay(strippedReply);
        const textToProcess = rawClosing ? rawClosing : introText;
        const afterDetails = textToProcess.replace(/<details_table>[\s\S]*?<\/details_table>/g, "").trim();
        const { text: finalClosingText, quickReplies } = parseQuickReplies(afterDetails);
        const finalIntroText = rawClosing ? introText : finalClosingText;

        addChat({
          role: "bot",
          text: finalIntroText,
          closingText: rawClosing ? finalClosingText : undefined,
          quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
          productCards: productCards.length > 0 ? productCards : undefined,
        });

        await supabase.from('chat_sessions').update({ last_interaction: new Date().toISOString() }).eq('id', sId);
      } else {
        addChat({ role: "bot", text: "Désolé, une erreur est survenue." });
      }
    } catch (err: any) {
      console.error("[useWorkflowExecutor] Direct AI error:", err);
      addChat({ role: "bot", text: "Désolé, problème de connexion." });
    } finally {
      setLoading(false);
    }
  }, [agentsMap, addChat]);

  // ── User sends a text message ──────────────────────────────────────────────
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const sId = dbSessionIdRef.current;
    if (!sId) return;

    const userMsgId = makeId();
    setMessages(prev => [...prev, { id: userMsgId, role: "user", text }]);

    await supabase.from('chat_messages').insert({ session_id: sId, role: 'user', content: text });

    // Update session last_interaction + user_name if name/email provided
    const updateData: Record<string, any> = { last_interaction: new Date().toISOString() };
    if (text.includes('@') || (text.trim().length > 1 && !text.toLowerCase().startsWith('http'))) {
      const cleanName = text.trim();
      if (cleanName.includes('@')) {
        updateData.user_name = cleanName;
      }
    }
    await supabase.from('chat_sessions').update(updateData).eq('id', sId);

    if (!isTakenOverRef.current && waitResolveRef.current) {
      globalContextRef.current.push(text);
      waitResolveRef.current(text);
      waitResolveRef.current = null;
    } else if (!isTakenOverRef.current) {
      globalContextRef.current.push(text);
      await sendDirectAIMessage(text);
    }
  }, [sendDirectAIMessage]);

  // ── Canvas-flow button clicks ──────────────────────────────────────────────
  const handleButtonClick = useCallback(async (label: string, btnId: string, msgId: string) => {
    const sId = dbSessionIdRef.current;
    if (!sId) return;

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, chosenButtonId: btnId } : m));
    const userMsgId = makeId();
    setMessages(prev => [...prev, { id: userMsgId, role: "user", text: label }]);

    await supabase.from('chat_messages').insert({ session_id: sId, role: 'user', content: label });
    await supabase.from('chat_sessions').update({ last_interaction: new Date().toISOString() }).eq('id', sId);

    if (!isTakenOverRef.current && waitResolveRef.current) {
      globalContextRef.current.push(label);
      waitResolveRef.current(`BTN::${label}::${btnId}`);
      waitResolveRef.current = null;
    }
  }, []);

  // ── Quick reply clicks (pill buttons from agent) ───────────────────────────
  const handleQuickReply = useCallback(async (text: string) => {
    setMessages(prev => prev.map(m => m.quickReplies ? { ...m, quickReplies: undefined } : m));
    const userMsgId = makeId();
    setMessages(prev => [...prev, { id: userMsgId, role: "user", text }]);

    const sId = dbSessionIdRef.current;
    if (sId) {
      await supabase.from('chat_messages').insert({ session_id: sId, role: 'user', content: text });
      await supabase.from('chat_sessions').update({ last_interaction: new Date().toISOString() }).eq('id', sId);
    }

    if (waitResolveRef.current) {
      globalContextRef.current.push(text);
      waitResolveRef.current(text);
      waitResolveRef.current = null;
    }
  }, []);

  return {
    messages,
    loading,
    runState,
    isWorkflowActive: nodes.length > 0,
    handleSend,
    handleButtonClick,
    handleQuickReply,
    waitingMsgId: waitingMsgIdRef.current,
  };
}
