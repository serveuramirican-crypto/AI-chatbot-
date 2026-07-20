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
}

type RunState = "idle" | "running" | "waiting" | "done";

function makeId() {
  return Math.random().toString(36).slice(2);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useWorkflowExecutor(projectId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runState, setRunState] = useState<RunState>("idle");
  const [loading, setLoading] = useState(false);
  const [agentsMap, setAgentsMap] = useState<Record<string, AgentConfig>>({});

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  const [isTakenOver, setIsTakenOver] = useState(false);
  const isTakenOverRef = useRef(false);

  // Persistent Session ID
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const waitResolveRef = useRef<((val: string) => void) | null>(null);
  const workflowMemoryRef = useRef<Record<string, string>>({});
  const hasStartedRef = useRef(false);
  const accumulatedContextRef = useRef<{ label: string; value: string }[]>([]);

  // Initialize Session ID — always create a fresh session so the canvas-flow
  // workflow always runs from the Start node, matching the Run modal behaviour.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const freshId = crypto.randomUUID();
      setSessionId(freshId);
      sessionIdRef.current = freshId;
    }
  }, []);

  // Create Session in Supabase (always fresh — no old-message preloading)
  useEffect(() => {
    const initSession = async () => {
      const sId = sessionIdRef.current;
      if (!sId) return;

      // Always create a new session row — fresh start every time
      const shortId = sId.slice(0, 5);
      await supabase
        .from('chat_sessions')
        .insert({
          id: sId,
          user_name: `Visitor-${shortId}`,
          is_taken_over: false,
        })
        .select()
        .single();

      // 2. Realtime Subscriptions for this session
      const channel = supabase.channel(`session_${sId}`)
        // Listen for new messages (e.g. from Admin dashboard)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sId}`
        }, (payload) => {
          const newMsg = payload.new;
          setMessages(prev => {
            // Avoid duplicate appending if we sent it
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              role: newMsg.role as any,
              text: newMsg.content,
              productCards: newMsg.products,
            }];
          });

          // If a new message is inserted by user while waiting, and AI is NOT paused, resolve the workflow
          if (newMsg.role === 'user' && !isTakenOverRef.current && waitResolveRef.current) {
            waitResolveRef.current(newMsg.content);
            waitResolveRef.current = null;
          }
        })
        // Listen for takeover updates
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `id=eq.${sId}`
        }, (payload) => {
          const updatedSess = payload.new;
          setIsTakenOver(updatedSess.is_taken_over);
          isTakenOverRef.current = updatedSess.is_taken_over;
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    if (sessionId) {
      initSession();
    }
  }, [sessionId]);

  // Load workflow & agents
  useEffect(() => {
    async function loadData() {
      let targetProjectId = projectId;

      if (!targetProjectId || targetProjectId === 'default') {
        const { data: wfs } = await supabase
          .from('workflows')
          .select('id')
          .not('id', 'like', '%\\_published%')
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (wfs && wfs.length > 0) {
          targetProjectId = wfs[0].id;
        } else {
          return;
        }
      }

      try {
        let row = await loadWorkflow(`${targetProjectId}_published`);
        if (!row) {
          row = await loadWorkflow(targetProjectId as string);
        }

        let newNodes: any[] = [];
        let newEdges: any[] = [];
        if (row) {
          newNodes = row.nodes || [];
          newEdges = row.edges || [];
        }

        const { data: agentsData } = await supabase.from('agents').select('*');
        if (agentsData) {
          const map: Record<string, AgentConfig> = {};
          for (const a of agentsData) {
            map[a.id] = rowToAgentConfig(a);
          }
          setAgentsMap(map);
        }

        setNodes(newNodes);
        setEdges(newEdges);
      } catch (err) {
        console.error("Failed to load workflow data:", err);
      }
    }
    loadData();
  }, [projectId]);

  // Save bot messages to Supabase helper
  const saveBotMessageToSupabase = async (text: string, products?: any[]) => {
    const sId = sessionIdRef.current;
    if (!sId) return;

    await supabase.from('chat_messages').insert({
      session_id: sId,
      role: 'agent',
      content: text,
      products: products || null,
    });
  };

  const addChat = useCallback((msg: Omit<ChatMessage, "id">) => {
    const id = makeId();
    setMessages((prev) => [...prev, { ...msg, id }]);

    // Save bot responses to database
    if (msg.role === 'bot') {
      saveBotMessageToSupabase(msg.text, msg.productCards);
    }

    return id;
  }, []);

  const findStartNode = useCallback(() => {
    const edge = edges.find((e) => e.from === "start");
    if (!edge) return null;
    return nodes.find((n) => n.id === edge.to) || null;
  }, [edges, nodes]);

  const findNextNode = useCallback(
    (fromNodeId: string, handleId?: string) => {
      const matchingEdge = edges.find(
        (e) =>
          e.from === fromNodeId &&
          (handleId ? e.sourceHandleId === handleId : !e.sourceHandleId),
      );
      if (!matchingEdge) return { node: null, deadEnd: true };
      if (matchingEdge.to === fromNodeId) return { node: null, deadEnd: true };
      const nextNode = nodes.find((n) => n.id === matchingEdge.to) ?? null;
      return { node: nextNode, deadEnd: nextNode === null };
    },
    [edges, nodes],
  );

  // The execution loop
  const runWorkflow = useCallback(async () => {
    setMessages([]);
    setRunState("running");
    workflowMemoryRef.current = {};
    accumulatedContextRef.current = [];

    await sleep(400);

    if (nodes.length === 0) {
      setRunState("done");
      return;
    }

    const firstNode = findStartNode();
    if (!firstNode) {
      setRunState("done");
      return;
    }

    let node = firstNode;
    let capturedInput = "";

    while (true) {
      await sleep(500);

      // Check if Taken Over before executing bot logic
      if (isTakenOverRef.current) {
        setRunState("waiting");
        await sleep(1000);
        continue;
      }

      // Agent Node
      if (node.type === "agent") {
        const agentId = node.agentId;
        if (!agentId || !agentsMap[agentId]) {
          addChat({ role: "bot", text: "⚠️ Agent configuration missing." });
          const { node: nextAgentNode, deadEnd } = findNextNode(node.id, undefined);
          if (deadEnd || !nextAgentNode) break;
          node = nextAgentNode;
          continue;
        }

        const ag = agentsMap[agentId];
        const precaptured = workflowMemoryRef.current[node.id];
        if (precaptured) {
          capturedInput = precaptured;
          delete workflowMemoryRef.current[node.id];
        }

        const buildUserContext = () => {
          const ctx = accumulatedContextRef.current;
          if (ctx.length === 0) return '';
          return ctx.map(c => `${c.label}: ${c.value}`).join(', ');
        };

        const buildCombinedMessage = (lastInput: string) => {
          const ctx = accumulatedContextRef.current;
          if (ctx.length === 0) return lastInput;
          const parts = ctx.map(c => `${c.label}: ${c.value}`);
          const lastInContext = ctx.at(-1);
          if (!lastInContext || lastInContext.value.toLowerCase() !== lastInput.toLowerCase()) {
            parts.push(lastInput);
          }
          return parts.join(', ');
        };

        if (capturedInput) {
          if (ag.exitConditions && ag.exitConditions.length > 0) {
            const matchedId = await matchExitCondition(capturedInput, ag.exitConditions);
            if (matchedId) {
              const { node: nextNode, deadEnd } = findNextNode(node.id, matchedId);
              capturedInput = "";
              if (deadEnd || !nextNode) {
                break;
              } else {
                node = nextNode;
                continue;
              }
            }
          }

          setLoading(true);
          const inputToSend = capturedInput;
          capturedInput = "";
          const combinedMessage = buildCombinedMessage(inputToSend);
          const userContext = buildUserContext();

          try {
            const agentRes: Response = await fetch("/api/chat/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentId,
                messages: [{ role: "user", content: combinedMessage }],
                userContext,
              }),
            });

            if (agentRes.ok) {
              const data = await agentRes.json();
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
            } else {
              addChat({ role: "bot", text: `⚠️ API Error: ${await agentRes.text()}` });
            }
          } catch (error: any) {
            addChat({ role: "bot", text: `⚠️ Network Error: ${error.message}` });
          } finally {
            setLoading(false);
          }
        }

        let agentExited = false;

        while (true) {
          setRunState("waiting");
          const rawPayload = await new Promise<string>((resolve) => {
            waitResolveRef.current = resolve;
          });
          setRunState("running");

          const isButtonPayload = rawPayload.startsWith("BTN::");
          const [userLabel] = isButtonPayload ? rawPayload.slice(5).split("::") : [rawPayload];

          if (ag.exitConditions && ag.exitConditions.length > 0) {
            const matchedId = await matchExitCondition(userLabel, ag.exitConditions);
            if (matchedId) {
              const { node: nextNode, deadEnd } = findNextNode(node.id, matchedId);
              if (deadEnd || !nextNode) {
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

          setLoading(true);
          try {
            const agentLoopContext = accumulatedContextRef.current.map(c => `${c.label}: ${c.value}`).join(', ');
            const agentLoopCombinedMsg = agentLoopContext
              ? `${agentLoopContext}, latest: ${userLabel}`
              : userLabel;
            const agentRes = await fetch("/api/chat/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentId,
                messages: [{ role: "user", content: agentLoopCombinedMsg }],
                userContext: agentLoopContext,
              }),
            });

            if (agentRes.ok) {
              const data = await agentRes.json();
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
            } else {
              addChat({ role: "bot", text: `⚠️ API Error: ${await agentRes.text()}` });
            }
          } catch (error: any) {
            addChat({ role: "bot", text: `⚠️ Network Error: ${error.message}` });
          } finally {
            setLoading(false);
          }
        }

        if (agentExited) {
          if (!node) break;
          continue;
        }
      }

      // Message Node
      if (node.type === "message" || !node.type) {
        const text = node.variants?.[0]?.trim() || "(empty message)";
        await sleep(400);

        const hasButtons = !!(node.buttons && node.buttons.length > 0);
        addChat({
          role: "bot",
          text,
          buttons: hasButtons ? node.buttons : undefined,
        });

        if (node.waitForInput || hasButtons) {
          setRunState("waiting");
          const rawPayload = await new Promise<string>((resolve) => {
            waitResolveRef.current = resolve;
          });
          setRunState("running");

          const isButtonPayload = rawPayload.startsWith("BTN::");
          const [userLabel, clickedButtonId] = isButtonPayload
            ? rawPayload.slice(5).split("::")
            : [rawPayload, undefined];

          const nodeQuestion = node.variants?.[0]?.trim() || node.label || "selection";

          if (!isButtonPayload) {
            capturedInput = userLabel;
            accumulatedContextRef.current = [
              ...accumulatedContextRef.current,
              { label: nodeQuestion.slice(0, 40), value: userLabel },
            ];
            if (node.saveEntireReply) {
              const outEdge = edges.find((e) => e.from === node.id && !e.sourceHandleId);
              if (outEdge) {
                const targetNode = nodes.find((n) => n.id === outEdge.to);
                if (targetNode && targetNode.type === "agent") {
                  workflowMemoryRef.current[targetNode.id] = userLabel;
                }
              }
            }
          } else if (isButtonPayload && clickedButtonId) {
            const clickedBtn = node.buttons?.find((b: any) => b.id === clickedButtonId);
            const label = clickedBtn?.label ?? userLabel;
            accumulatedContextRef.current = [
              ...accumulatedContextRef.current,
              { label: nodeQuestion.slice(0, 40), value: label },
            ];
            const btnEdge = edges.find((e) => e.from === node.id && e.sourceHandleId === clickedButtonId);
            if (btnEdge) {
              const targetNode = nodes.find((n) => n.id === btnEdge.to);
              if (targetNode && targetNode.type === "agent") {
                workflowMemoryRef.current[targetNode.id] = label;
              }
            }
          }

          await sleep(300);

          const { node: nextNode, deadEnd } = findNextNode(node.id, clickedButtonId);
          if (deadEnd || !nextNode) {
            setRunState("done");
            return;
          }

          node = nextNode;
          continue;
        }
      }

      const { node: nextNode, deadEnd } = findNextNode(node.id, undefined);
      if (deadEnd || !nextNode) break;
      node = nextNode;
    }

    setRunState("done");
  }, [nodes, edges, agentsMap, addChat, findStartNode, findNextNode]);

  useEffect(() => {
    if (nodes.length > 0 && !hasStartedRef.current && sessionId) {
      hasStartedRef.current = true;
      runWorkflow();
    }
  }, [nodes, runWorkflow, sessionId]);

  // Handle user sending text
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const sId = sessionIdRef.current;
    if (!sId) return;

    // 1. Optimistically append message to local UI
    const userMsgId = makeId();
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", text }]);

    // 2. Insert into Supabase
    await supabase.from('chat_messages').insert({
      id: userMsgId,
      session_id: sId,
      role: 'user',
      content: text,
    });

    // Update last_interaction in session
    await supabase.from('chat_sessions').update({
      last_interaction: new Date().toISOString()
    }).eq('id', sId);

    // 3. Trigger workflow resolve if AI is active and NOT taken over
    if (!isTakenOverRef.current && waitResolveRef.current) {
      waitResolveRef.current(text);
      waitResolveRef.current = null;
    }
  }, []);

  // Handle canvas-flow button clicks
  const handleButtonClick = useCallback(async (label: string, btnId: string, msgId: string) => {
    const sId = sessionIdRef.current;
    if (!sId) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, chosenButtonId: btnId } : m)),
    );

    const userMsgId = makeId();
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", text: label }]);

    // Save to Supabase
    await supabase.from('chat_messages').insert({
      id: userMsgId,
      session_id: sId,
      role: 'user',
      content: label,
    });

    await supabase.from('chat_sessions').update({
      last_interaction: new Date().toISOString()
    }).eq('id', sId);

    if (!isTakenOverRef.current && waitResolveRef.current) {
      waitResolveRef.current(`BTN::${label}::${btnId}`);
      waitResolveRef.current = null;
    }
  }, [runState]);

  return {
    messages,
    loading,
    runState,
    isWorkflowActive: nodes.length > 0,
    handleSend,
    handleButtonClick,
  };
}
