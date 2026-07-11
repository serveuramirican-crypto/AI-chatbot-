import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { loadWorkflow, WorkflowRow } from '@/lib/workflowStore';
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
  role: "bot" | "user";
  text: string;
  buttons?: { id: string; label: string }[];
  chosenButtonId?: string;
  quickReplies?: string[];
  productCards?: ProductItem[];
  closingText?: string;
  // Fallback for legacy format
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

  const sessionIdRef = useRef<string | null>(null);
  const waitResolveRef = useRef<((val: string) => void) | null>(null);
  const workflowMemoryRef = useRef<Record<string, string>>({});
  const hasStartedRef = useRef(false);

  // Load workflow & agents
  useEffect(() => {
    async function loadData() {
      if (!projectId || projectId === 'default') return;
      
      try {
        let row = await loadWorkflow(`${projectId}_published`);
        
        // Fallback to draft if published doesn't exist
        if (!row) {
          row = await loadWorkflow(projectId);
        }

        let newNodes: any[] = [];
        let newEdges: any[] = [];
        if (row) {
          newNodes = row.nodes || [];
          newEdges = row.edges || [];
        }

        // Fetch agents
        const { data: agentsData } = await supabase.from('agents').select('*');
        if (agentsData) {
          const map: Record<string, AgentConfig> = {};
          for (const a of agentsData) {
            map[a.id] = rowToAgentConfig(a);
          }
          setAgentsMap(map);
        }
        
        // Update nodes and edges only AFTER agents are ready
        setNodes(newNodes);
        setEdges(newEdges);
      } catch (err) {
        console.error("Failed to load workflow data:", err);
      }
    }
    loadData();
  }, [projectId]);

  const addChat = useCallback((msg: Omit<ChatMessage, "id">) => {
    const id = makeId();
    setMessages((prev) => [...prev, { ...msg, id }]);
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
    sessionIdRef.current = null;
    workflowMemoryRef.current = {};

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

          try {
            const agentRes = await fetch("/api/chat/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentId,
                messages: [{ role: "user", content: inputToSend }],
                sessionId: sessionIdRef.current ?? undefined,
              }),
            });

            if (agentRes.ok) {
              const data = await agentRes.json();
              if (data.sessionId && !sessionIdRef.current) {
                sessionIdRef.current = data.sessionId;
              }
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
            const agentRes = await fetch("/api/chat/agent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentId,
                messages: [{ role: "user", content: userLabel }],
                sessionId: sessionIdRef.current ?? undefined,
              }),
            });

            if (agentRes.ok) {
              const data = await agentRes.json();
              if (data.sessionId && !sessionIdRef.current) {
                sessionIdRef.current = data.sessionId;
              }
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

          if (!isButtonPayload) {
            capturedInput = userLabel;
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
            const btnEdge = edges.find((e) => e.from === node.id && e.sourceHandleId === clickedButtonId);
            if (btnEdge) {
              const targetNode = nodes.find((n) => n.id === btnEdge.to);
              if (targetNode && targetNode.type === "agent") {
                const label = clickedBtn?.label ?? userLabel;
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

      // Default transition if no wait needed
      const { node: nextNode, deadEnd } = findNextNode(node.id, undefined);
      if (deadEnd || !nextNode) break;
      node = nextNode;
    }

    setRunState("done");
  }, [nodes, edges, agentsMap, addChat, findStartNode, findNextNode]);

  useEffect(() => {
    if (nodes.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      runWorkflow();
    }
  }, [nodes, runWorkflow]);

  // Handle user sending text
  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { id: makeId(), role: "user", text }]);

    if (waitResolveRef.current) {
      waitResolveRef.current(text);
      waitResolveRef.current = null;
    }
  }, []);

  // Handle canvas-flow button clicks
  const handleButtonClick = useCallback((label: string, btnId: string, msgId: string) => {
    if (runState !== "waiting") return;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, chosenButtonId: btnId } : m)),
    );
    setMessages((prev) => [...prev, { id: makeId(), role: "user", text: label }]);

    if (waitResolveRef.current) {
      waitResolveRef.current(`BTN::${label}::${btnId}`);
      waitResolveRef.current = null;
    }
  }, [runState]);

  // Handle legacy / direct API fallback (if no workflow was loaded)
  const [legacyLoading, setLegacyLoading] = useState(false);
  const legacySessionIdRef = useRef<string | null>(null);

  const handleLegacySend = useCallback(async (text: string) => {
    if (!text.trim() || legacyLoading) return;
    const userMessage = text;
    setMessages((prev) => [...prev, { id: makeId(), role: 'user', text: userMessage }]);
    setLegacyLoading(true);

    if (!legacySessionIdRef.current) {
      legacySessionIdRef.current = crypto.randomUUID();
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId: legacySessionIdRef.current })
      });
      const data = await res.json();

      if (data.response) {
        setMessages((prev) => [...prev, {
          id: makeId(),
          role: 'bot',
          text: data.response,
          product: data.raw_json?.matched_product || data.raw_json?.matched_products,
          suggestedButtons: data.raw_json?.suggested_buttons
        }]);
      } else if (data.error) {
        setMessages((prev) => [...prev, { id: makeId(), role: 'bot', text: `Error: ${data.error}` }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: makeId(), role: 'bot', text: "Failed to connect to the server." }]);
    } finally {
      setLegacyLoading(false);
    }
  }, [legacyLoading]);

  return {
    messages,
    loading: loading || legacyLoading,
    runState,
    isWorkflowActive: nodes.length > 0,
    handleSend: nodes.length > 0 ? handleSend : handleLegacySend,
    handleButtonClick,
  };
}
