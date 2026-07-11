"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Plus,
  Search,
  Play,
  ChevronDown,
  X,
  Workflow,
  Move,
  Map,
  MessageCircle,
  Image as ImageIcon,
  Sparkles,
  BookOpen,
  Trash2,
  Pencil,
  Check,
  Bot,
  RefreshCw,
} from "lucide-react"
import StartNode from "./StartNode"
import ActionsDropdown from "./ActionsDropdown"
import NodeLibrary from "./NodeLibrary"
import MessageNode, { MessageNodeData, NodeButton } from "./MessageNode"
import MessageSettingsPanel from "./MessageSettingsPanel"
import RunModal from "./RunModal"
import ChatDesignPanel, { ChatThemeProvider } from "./ChatDesignPanel"
import CanvasEdges from "./CanvasEdges"
import PlaybookReferenceNode from "./PlaybookReferenceNode"
import AgentNode from "./AgentNode"
import AgentStudio from "./AgentStudio"
import { AgentStoreProvider, useAgentActions, useAgents, useAgentBootstrap, useAgentList, persistAgent, generateAgentId, createDefaultTools } from "@/lib/agentStore"
import { usePlaybooks, usePlaybookActions, blankPlaybook } from "@/lib/playbookStore"
import type { PlaybookReferenceNodeData, Playbook } from "@/types/playbook"
import type { AgentNodeData, AgentConfig } from "@/types/agent"
import {
  type WorkflowMeta,
  type WorkflowRow,
  listWorkflows,
  createWorkflow,
  deleteWorkflow,
  renameWorkflow,
  useWorkflowPersistence,
  publishWorkflow,
} from "@/lib/workflowStore"

// ── Types ─────────────────────────────────────────────────────────────────────
type FlowNode = MessageNodeData | PlaybookReferenceNodeData | AgentNodeData
interface Point { x: number; y: number }
interface Edge {
  id: string
  from: string
  to: string
  /** Button handle id that initiated this edge (undefined = main body port) */
  sourceHandleId?: string
}

type FlowState = "idle" | "dragging" | "open"

/** Collision-safe unique id */
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// Path generation logic is now inlined in the component.

function CanvasFlowPageInner() {
  // ── Playbook store ──────────────────────────────────────────────────────────
  const allPlaybooks = usePlaybooks()
  const { createPlaybook } = usePlaybookActions()

  // ── Agent store ─────────────────────────────────────────────────────────
  const { createAgent } = useAgentActions()
  const allAgents = useAgents()
  const allAgentsList = useAgentList()

  // Bootstrap: populate agent store from Supabase on mount
  useAgentBootstrap()

  // ── Workflow persistence state ─────────────────────────────────────────────
  const [workflows, setWorkflows] = useState<WorkflowMeta[]>([])
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null)
  const [workflowSearch, setWorkflowSearch] = useState('')
  /** Id being renamed inline (null = none) */
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  /** Picker modal: pending node waiting for a playbook to be assigned */
  const [playbookPickerPos, setPlaybookPickerPos] = useState<{ x: number; y: number; sourceId?: string; handleId?: string } | null>(null)

  /** Picker modal: pending Agent node waiting for an agent to be assigned */
  const [agentPickerPos, setAgentPickerPos] = useState<{ x: number; y: number; sourceId?: string; handleId?: string } | null>(null)
  const [flowState, setFlowState] = useState<FlowState>("idle")
  const [fromPt, setFromPt] = useState<Point>({ x: 0, y: 0 })
  const [toPt, setToPt] = useState<Point>({ x: 0, y: 0 })

  // Nodes & Edges State
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [showRunModal, setShowRunModal] = useState(false)
  const [showDesignPanel, setShowDesignPanel] = useState(false)
  const [showWidgetScriptModal, setShowWidgetScriptModal] = useState(false)
  const [startNodePos, setStartNodePos] = useState<Point>({ x: 340, y: 280 })

  // ── Pending connection (direct port-to-port drag) ─────────────────────────
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string
    sourceHandleId?: string
    mouseX: number
    mouseY: number
  } | null>(null)

  // Pan state
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const panRef = useRef<Point>({ x: 0, y: 0 })
  const [isPanningState, setIsPanningState] = useState(false)

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragSourceRef = useRef<string | null>(null)
  const dragHandleRef = useRef<string | undefined>(undefined)
  const isDraggingNode = useRef<string | null>(null)
  const isDragging = useRef(false)
  const isPanning = useRef(false)
  const hasDragged = useRef(false)
  const lastMousePos = useRef<Point>({ x: 0, y: 0 })
  /** Mirror of nodes state — always current, safe to read synchronously */
  const nodesRef = useRef<FlowNode[]>([])

  /** Blocks the parasitic click that fires on the canvas right after mouseup */
  const justReleased = useRef(false)

  // Keep nodesRef in sync with nodes state
  useEffect(() => { nodesRef.current = nodes }, [nodes])

  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)

  // ── Bootstrap: load workflow list on mount ─────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      let wfs = await listWorkflows()
      if (wfs.length === 0) {
        // Auto-create a default workflow on first visit
        const newId = await createWorkflow('Untitled workflow')
        wfs = await listWorkflows()
        setActiveWorkflowId(newId)
      } else {
        setActiveWorkflowId(wfs[0].id)
      }
      setWorkflows(wfs)
    }
    bootstrap()
  }, [])

  // ── Persistence hook: auto-save + load on workflowId change ───────────────
  useWorkflowPersistence({
    workflowId: activeWorkflowId,
    nodes,
    edges,
    startNodePos,
    onLoad: (row: WorkflowRow) => {
      setNodes((row.nodes as FlowNode[]) ?? [])
      setEdges((row.edges as Edge[]) ?? [])
      setStartNodePos((row.start_node_pos as Point) ?? { x: 340, y: 280 })
      setActiveNodeId(null)
      setSelectedEdgeId(null)
    },
  })

  // ── Workflow sidebar actions ────────────────────────────────────────────────
  const handleCreateWorkflow = useCallback(async () => {
    const newId = await createWorkflow('Untitled workflow')
    const wfs = await listWorkflows()
    setWorkflows(wfs)
    // Switch to new workflow (clears canvas — load hook will fire)
    setNodes([])
    setEdges([])
    setStartNodePos({ x: 340, y: 280 })
    setActiveWorkflowId(newId)
  }, [])

  const handleSwitchWorkflow = useCallback((id: string) => {
    if (id === activeWorkflowId) return
    setActiveWorkflowId(id)
  }, [activeWorkflowId])

  const handleDeleteWorkflow = useCallback(async (id: string) => {
    await deleteWorkflow(id)
    const wfs = await listWorkflows()
    setWorkflows(wfs)
    if (id === activeWorkflowId) {
      if (wfs.length > 0) {
        setActiveWorkflowId(wfs[0].id)
      } else {
        // Create a fresh one if we deleted the last
        const newId = await createWorkflow('Untitled workflow')
        const refreshed = await listWorkflows()
        setWorkflows(refreshed)
        setActiveWorkflowId(newId)
      }
    }
  }, [activeWorkflowId])

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }, [])

  const handleCommitRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return }
    await renameWorkflow(renamingId, renameValue.trim())
    setWorkflows(prev => prev.map(w => w.id === renamingId ? { ...w, name: renameValue.trim() } : w))
    setRenamingId(null)
  }, [renamingId, renameValue])

  // ── Helpers ─────────────────────────────────────────────────────────────────
  /** Get coords relative to the canvas WORLD (accounting for pan) */
  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
    return {
      x: clientX - rect.left - panRef.current.x,
      y: clientY - rect.top - panRef.current.y
    }
  }, [])

  // ── Layout constants (pure state-based — no DOM measurement) ─────────────────
  const START_NODE_WIDTH = 130 // Pill body + handle offset
  const START_NODE_HEIGHT = 40
  const MESSAGE_NODE_WIDTH = 266 // 256 width + 10px handle offset
  const MESSAGE_NODE_HEIGHT = 80

  // ── Mouse handlers ───────────────────────────────────────────────────────────
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return
    e.stopPropagation() // Prevent canvas panning

    isDraggingNode.current = nodeId
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }, [])
  const handlePortMouseDown = useCallback((e: React.MouseEvent, sourceId: string, handleId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (flowState !== "idle") return

    isDragging.current = true
    justReleased.current = false
    dragSourceRef.current = sourceId
    dragHandleRef.current = handleId

    // Pure state-based calculation for from point (no getBoundingClientRect)
    let from = { x: 0, y: 0 }
    if (sourceId === 'start') {
      from = {
        x: startNodePos.x + START_NODE_WIDTH,
        y: startNodePos.y + (START_NODE_HEIGHT / 2),
      }
    } else {
      const n = nodes.find(x => x.id === sourceId)
      if (n) {
        from = {
          x: n.position.x + MESSAGE_NODE_WIDTH,
          y: n.position.y + (MESSAGE_NODE_HEIGHT / 2),
        }
      }
    }

    const to = toWorld(e.clientX, e.clientY)
    setFromPt(from)
    setToPt(to)
    setFlowState("dragging")
  }, [flowState, toWorld, nodes])

  /**
   * Click-to-connect: immediately opens the ActionsDropdown at a fixed offset
   * to the right of the handle, without requiring a drag gesture.
   */
  const handlePortClick = useCallback((e: React.MouseEvent, sourceId: string, handleId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (flowState !== "idle") return

    dragSourceRef.current = sourceId
    dragHandleRef.current = handleId
    justReleased.current = false

    // Pure state-based calculation for from point
    let from = { x: 0, y: 0 }
    if (sourceId === 'start') {
      from = {
        x: startNodePos.x + START_NODE_WIDTH,
        y: startNodePos.y + (START_NODE_HEIGHT / 2),
      }
    } else {
      const n = nodes.find(x => x.id === sourceId)
      if (n) {
        from = {
          x: n.position.x + MESSAGE_NODE_WIDTH,
          y: n.position.y + (MESSAGE_NODE_HEIGHT / 2),
        }
      }
    }

    const dropdownPt = { x: from.x + 96, y: from.y }
    setFromPt(from)
    setToPt(dropdownPt)
    setFlowState("open")
  }, [flowState, nodes])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (flowState === "dragging") return

    isPanning.current = true
    setIsPanningState(true)
    hasDragged.current = false
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }, [flowState])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingNode.current) {
        const dx = e.clientX - lastMousePos.current.x
        const dy = e.clientY - lastMousePos.current.y

        if (isDraggingNode.current === 'start') {
          setStartNodePos(prev => ({ x: prev.x + dx, y: prev.y + dy }))
        } else {
          setNodes(prev => prev.map(n =>
            n.id === isDraggingNode.current
              ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
              : n
          ))
        }
        lastMousePos.current = { x: e.clientX, y: e.clientY }
      } else if (isDragging.current) {
        setToPt(toWorld(e.clientX, e.clientY))
      } else if (isPanning.current) {
        hasDragged.current = true
        const dx = e.clientX - lastMousePos.current.x
        const dy = e.clientY - lastMousePos.current.y
        const newPan = { x: panRef.current.x + dx, y: panRef.current.y + dy }
        panRef.current = newPan
        setPan(newPan)
        lastMousePos.current = { x: e.clientX, y: e.clientY }
      }
    }

    const onUp = (e: MouseEvent) => {
      if (isDraggingNode.current) {
        isDraggingNode.current = null
      }

      if (isPanning.current) {
        isPanning.current = false
        setIsPanningState(false)
        if (hasDragged.current) {
          justReleased.current = true
        }
      }

      if (isDragging.current) {
        if (!hasDragged.current) {
          // Wait, we need hasDragged for the connector too? 
          // the connector is always dragging, let's just set justReleased
        }
        isDragging.current = false
        justReleased.current = true   // ← block the parasitic click
        setToPt(toWorld(e.clientX, e.clientY))
        setFlowState("open")
      }
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [toWorld])

  // ── Dismiss ──────────────────────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    isDragging.current = false
    setFlowState("idle")
  }, [])

  // ── HTML5 drag-drop from NodeLibrary ─────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const actionType = e.dataTransfer.getData('actionType')
    if (!actionType) return

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    const position = {
      x: e.clientX - (canvasRect?.left ?? 0) - panRef.current.x,
      y: e.clientY - (canvasRect?.top ?? 0) - panRef.current.y,
    }

    if (actionType === 'playbook_reference') {
      // Open picker so user can choose which playbook to pin here
      setPlaybookPickerPos({ x: position.x, y: position.y })
      return
    }

    // ── Agent drop ───────────────────────────────────────────────────────────
    if (actionType === 'agent') {
      // Open the agent picker so the user selects a real Supabase agent
      setAgentPickerPos({ x: position.x, y: position.y })
      return
    }

    const newNode: FlowNode = {
      id: generateId(),
      type: 'message',
      variants: [actionType === 'chat_input' ? 'Waiting for user message...' : actionType],
      waitForInput: true,
      buttons: [],
      position,
    }

    // Read nodesRef synchronously — always current, no stale-closure risk,
    // no Strict Mode double-invocation issues (unlike reading inside updaters).
    const isFirstMessageNode = nodesRef.current.length === 0

    setNodes((prev) => [...prev, newNode])

    if (isFirstMessageNode) {
      // Auto-connect: Start → first dropped node
      const autoEdge: Edge = {
        id: generateId(),
        from: 'start',
        to: newNode.id,
      }
      console.log('[CanvasFlow] Auto-connecting Start →', newNode.id)
      setEdges((prev) => {
        if (prev.some(ed => ed.to === newNode.id)) return prev // idempotent
        return [...prev, autoEdge]
      })
    }

    setActiveNodeId(newNode.id)
  }, [])

  /** Confirm playbook selection from the picker modal */
  const handlePlaybookPick = useCallback((playbookId: string) => {
    if (!playbookPickerPos) return
    const { x, y, sourceId, handleId } = playbookPickerPos

    const newNode: PlaybookReferenceNodeData = {
      id: generateId(),
      type: 'playbook_reference',
      position: { x, y },
      playbookId,
    }
    setNodes(prev => [...prev, newNode])
    setActiveNodeId(newNode.id)

    if (sourceId) {
      setEdges(prev => [...prev, {
        id: generateId(),
        from: sourceId,
        to: newNode.id,
        ...(handleId ? { sourceHandleId: handleId } : {}),
      }])
    }

    setPlaybookPickerPos(null)
    dragSourceRef.current = null
    dragHandleRef.current = undefined
    handleDismiss()
  }, [playbookPickerPos, handleDismiss])

  /**
   * Confirm agent selection from the agent picker modal.
   * Creates an AgentNode that references an existing Supabase agent.
   * Also handles the "create new" path — persists a fresh agent to Supabase first.
   */
  const handleAgentPick = useCallback(async (pickedAgentId: string) => {
    if (!agentPickerPos) return
    const { x, y, sourceId, handleId } = agentPickerPos

    const newNode: AgentNodeData = {
      id: generateId(),
      type: 'agent',
      position: { x, y },
      agentId: pickedAgentId,
    }

    const isFirst = nodesRef.current.length === 0
    setNodes(prev => [...prev, newNode])
    setActiveNodeId(newNode.id)

    if (sourceId) {
      setEdges(prev => [...prev, {
        id: generateId(),
        from: sourceId,
        to: newNode.id,
        ...(handleId ? { sourceHandleId: handleId } : {}),
      }])
    } else if (isFirst) {
      setEdges(prev => {
        if (prev.some(ed => ed.to === newNode.id)) return prev
        return [...prev, { id: generateId(), from: 'start', to: newNode.id }]
      })
    }

    setAgentPickerPos(null)
    dragSourceRef.current = null
    dragHandleRef.current = undefined
    handleDismiss()
  }, [agentPickerPos, handleDismiss])

  /**
   * Update the agentId on an existing Agent node (user swapped the agent via the
   * in-node dropdown). Triggers an auto-save via the nodes state change.
   */
  const handleAgentSelect = useCallback((nodeId: string, newAgentId: string) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, agentId: newAgentId } as AgentNodeData : n
    ))
  }, [])

  /** Delete any node and its attached edges from the canvas */
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId))
    if (activeNodeId === nodeId) {
      setActiveNodeId(null)
    }
  }, [activeNodeId])

  // ── Direct port-to-port connection lifecycle ──────────────────────────────────
  const handleConnectionStart = useCallback((sourceId: string, sourceHandleId?: string) => {
    setPendingConnection({ sourceId, sourceHandleId, mouseX: 0, mouseY: 0 })
  }, [])

  const handleConnectionDrag = useCallback((mouseX: number, mouseY: number) => {
    setPendingConnection((prev) => (prev ? { ...prev, mouseX, mouseY } : prev))
  }, [])

  const handleConnectionEnd = useCallback((targetId: string) => {
    isDragging.current = false
    setFlowState("idle")
    justReleased.current = true

    if (!dragSourceRef.current) return
    const sourceId = dragSourceRef.current
    const sourceHandleId = dragHandleRef.current

    if (sourceId === targetId) {
      dragSourceRef.current = null
      dragHandleRef.current = undefined
      return
    }

    setEdges((prevEdges) => {
      const alreadyExists = prevEdges.some(
        (edge) =>
          edge.from === sourceId &&
          edge.sourceHandleId === sourceHandleId &&
          edge.to === targetId
      )
      if (alreadyExists) return prevEdges

      const newEdge: Edge = {
        id: generateId(),
        from: sourceId,
        to: targetId,
        ...(sourceHandleId ? { sourceHandleId } : {}),
      }
      return [...prevEdges, newEdge]
    })

    dragSourceRef.current = null
    dragHandleRef.current = undefined
  }, [])

  const handleConnectionCancel = useCallback(() => {
    setPendingConnection(null)
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleActionSelect = useCallback((label: string) => {
    if (label === "Message") {
      const newNode: MessageNodeData = {
        id: `msg_${Date.now()}`,
        type: "message",
        variants: [""],
        waitForInput: true,
        buttons: [],
        position: { x: toPt.x, y: toPt.y - 40 },
      }
      setNodes(prev => [...prev, newNode])
      setActiveNodeId(newNode.id)

      if (dragSourceRef.current) {
        const newEdge = {
          id: `edge_${Date.now()}`,
          from: dragSourceRef.current!,
          to: newNode.id,
          sourceHandleId: dragHandleRef.current,
        }
        console.log('[CanvasFlow] Dropdown edge:', newEdge)
        setEdges(prev => [...prev, newEdge])
        dragSourceRef.current = null
        dragHandleRef.current = undefined
      }
    } else if (label === "AI Agent") {
      // Open the agent picker at the current drop point
      setAgentPickerPos({
        x: toPt.x,
        y: toPt.y - 40,
        sourceId: dragSourceRef.current ?? undefined,
        handleId: dragHandleRef.current,
      })
      // Don't dismiss here — picker takes over; dismiss after pick
      return
    } else if (label === "Playbook") {
      // Open the playbook picker at the current drop point
      setPlaybookPickerPos({
        x: toPt.x,
        y: toPt.y - 40,
        sourceId: dragSourceRef.current ?? undefined,
        handleId: dragHandleRef.current,
      })
      // Don't call handleDismiss here — picker takes over; dismiss after pick
      return
    }
    handleDismiss()
  }, [toPt, handleDismiss, createAgent])

  const handleNodeUpdate = useCallback((updatedNode: FlowNode) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n))
  }, [])

  /** Delete an edge by id (triggered from the CanvasEdges delete button) */
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId))
    setSelectedEdgeId(null)
  }, [])

  // Debug: log edges whenever they change
  useEffect(() => {
    console.log('[CanvasFlow] edges state:', edges)
  }, [edges])

  // ── Derived ──────────────────────────────────────────────────────────────────
  // Only draw the live drag line while the user is actively dragging.
  // When flowState === "open" (click-connect path) we show the dropdown directly
  // and skip the ghost line so no stale connector appears behind the menu.
  const showLine = flowState === "dragging"
  const showDropdown = flowState === "open"

  // Adaptive Bezier — same formula as getBezierPath in CanvasEdges.tsx
  // so ghost lines look identical to confirmed edges.
  const _dx = Math.abs(toPt.x - fromPt.x)
  const _offset = Math.min(Math.max(_dx * 0.5, 80), 240)
  const pathD = `M ${fromPt.x} ${fromPt.y} C ${fromPt.x + _offset} ${fromPt.y}, ${toPt.x - _offset} ${toPt.y}, ${toPt.x} ${toPt.y}`

  const cursorStyle = isPanningState ? "grabbing" : flowState === "dragging" ? "crosshair" : "grab"

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#f0f2f5]">

      {/* ── Left Sidebar – Workflows Manager ──────────────────────────────── */}
      <aside className="relative z-20 flex w-[200px] shrink-0 flex-col border-r border-[#2a2d35] bg-[#1c1f26]">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-white">Workflows</span>
          <button
            title="New workflow"
            onClick={handleCreateWorkflow}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <input
              type="text"
              placeholder="Search"
              value={workflowSearch}
              onChange={(e) => setWorkflowSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-gray-400 placeholder-gray-600 outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {workflows
            .filter(w => w.name.toLowerCase().includes(workflowSearch.toLowerCase()))
            .map(wf => (
              <div
                key={wf.id}
                className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition ${wf.id === activeWorkflowId
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                  }`}
              >
                <Workflow className="h-3.5 w-3.5 shrink-0 text-gray-400" />

                {renamingId === wf.id ? (
                  /* Inline rename input */
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleCommitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitRename()
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="min-w-0 flex-1 bg-transparent text-xs font-medium text-white outline-none ring-1 ring-indigo-500/50 rounded px-1"
                  />
                ) : (
                  <button
                    className="min-w-0 flex-1 truncate text-xs font-medium text-white/80 text-left"
                    onClick={() => handleSwitchWorkflow(wf.id)}
                  >
                    {wf.name}
                  </button>
                )}

                {/* Action buttons — visible on hover or when active */}
                <div className={`flex shrink-0 items-center gap-0.5 transition-opacity ${wf.id === activeWorkflowId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                  {renamingId === wf.id ? (
                    <button
                      title="Confirm rename"
                      onClick={handleCommitRename}
                      className="flex h-4 w-4 items-center justify-center rounded text-green-400 hover:text-green-300"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      title="Rename"
                      onClick={() => handleStartRename(wf.id, wf.name)}
                      className="flex h-4 w-4 items-center justify-center rounded text-gray-500 hover:text-white"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                  )}
                  <button
                    title="Delete workflow"
                    onClick={() => handleDeleteWorkflow(wf.id)}
                    className="flex h-4 w-4 items-center justify-center rounded text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))
          }
          {workflows.length === 0 && (
            <p className="px-3 py-4 text-center text-[10px] text-gray-600 italic">No workflows yet</p>
          )}
        </nav>
      </aside>

      {/* ── Main Canvas ─────────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden"
        style={{ cursor: cursorStyle }}
        onMouseDown={handleCanvasMouseDown}
        /* HTML5 drop target for NodeLibrary drag-and-drop */
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        /* Live mouse tracking for pendingConnection drag line */
        onMouseMove={(e) => {
          if (pendingConnection) {
            const rect = canvasRef.current?.getBoundingClientRect()
            handleConnectionDrag(
              e.clientX - (rect?.left ?? 0) - panRef.current.x,
              e.clientY - (rect?.top ?? 0) - panRef.current.y,
            )
          }
        }}
        /* Cancel pending connection when releasing mouse on empty canvas */
        onMouseUp={() => { if (pendingConnection) handleConnectionCancel() }}
        /* Click empty canvas → dismiss dropdown + deselect edges */
        onClick={() => {
          if (justReleased.current) {
            justReleased.current = false  // absorb the parasitic click, do nothing
            return
          }
          if (flowState === "open") handleDismiss()
          setActiveNodeId(null)    // deselect nodes
          setSelectedEdgeId(null)  // deselect edges
        }}
      >
        {/* Dotted grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #c8cdd8 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        />

        {/* ── Panning Layer ─────────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 w-full h-full origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          {/* ── Confirmed Edges: INSIDE panning layer so world-space coords
               match without manual offset — SVG moves with the pan transform ── */}
          <CanvasEdges
            edges={edges}
            nodes={nodes}
            startNodePos={startNodePos}
            selectedEdgeId={selectedEdgeId}
            onSelectEdge={setSelectedEdgeId}
            onDeleteEdge={handleDeleteEdge}
            getPlaybook={(id) => allPlaybooks.find(p => p.id === id)}
            getAgent={(id) => allAgents[id]}
          />

          {/* ── Live drag ghost line (click-to-connect / drag-to-connect) ─── */}
          {showLine && (
            <svg
              className="absolute inset-0 pointer-events-none w-full h-full"
              overflow="visible"
              style={{ zIndex: 10 }}
            >
              <defs>
                <marker
                  id="arrowhead-drag"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L8,3 z" fill="#60a5fa" />
                </marker>
              </defs>
              <path
                d={pathD}
                stroke="#60a5fa"
                strokeWidth="2"
                fill="none"
                strokeDasharray="6 4"
                markerEnd="url(#arrowhead-drag)"
              />
            </svg>
          )}

          {/* ── Pending connection drag line (port-to-port) ──────────────── */}
          {pendingConnection && (
            <svg
              className="absolute inset-0 pointer-events-none w-full h-full"
              overflow="visible"
              style={{ zIndex: 11 }}
            >
              <defs>
                <marker
                  id="arrowhead-pending"
                  markerWidth="8" markerHeight="8"
                  refX="7" refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L8,3 z" fill="#a78bfa" />
                </marker>
              </defs>
              {(() => {
                // Compute the source point in world-space
                let sx = 0, sy = 0
                if (pendingConnection.sourceId === 'start') {
                  sx = startNodePos.x + START_NODE_WIDTH
                  sy = startNodePos.y + START_NODE_HEIGHT / 2
                } else {
                  const sn = nodes.find(n => n.id === pendingConnection.sourceId)
                  if (sn) {
                    sx = sn.position.x + MESSAGE_NODE_WIDTH
                    sy = sn.position.y + MESSAGE_NODE_HEIGHT / 2
                  }
                }
                const tx = pendingConnection.mouseX
                const ty = pendingConnection.mouseY
                const pdx = Math.abs(tx - sx)
                const pOffset = Math.min(Math.max(pdx * 0.5, 80), 240)
                const d = `M ${sx} ${sy} C ${sx + pOffset} ${sy}, ${tx - pOffset} ${ty}, ${tx} ${ty}`
                return (
                  <path
                    d={d}
                    stroke="#a78bfa"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="6 4"
                    markerEnd="url(#arrowhead-pending)"
                  />
                )
              })()}
            </svg>
          )}

          {/* ── Start Node ────────────────────────────────────────────────────── */}
          <div
            className="absolute z-20 cursor-grab active:cursor-grabbing"
            style={{ left: startNodePos.x, top: startNodePos.y + (START_NODE_HEIGHT / 2), transform: "translateY(-50%)" }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => handleNodeMouseDown(e, "start")}
                  /* Input port: completes a pending port-to-port connection */
                  onMouseUp={(e) => {
                    if (isDragging.current && dragSourceRef.current) {
                      handleConnectionEnd('start')
                    }
                  }}
          >
            <StartNode
              onPortMouseDown={(e) => handlePortMouseDown(e, "start")}
              onPortClick={(e) => handlePortClick(e, "start")}
              connected={edges.some(edge => edge.from === "start") || (showLine && dragSourceRef.current === "start")}
            />
          </div>

          {/* ── Render Nodes ──────────────────────────────────────────────────── */}
          {nodes.map(node => {
            if (node.type === "message") {
              const nodeData = node as MessageNodeData
              // Build the set of handle ids that already have edges
              const connectedHandles = new Set(
                edges
                  .filter(e => e.from === node.id && e.sourceHandleId)
                  .map(e => e.sourceHandleId!)
              )
              return (
                <div
                  key={node.id}
                  className="absolute z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  /* Input port: completes a pending port-to-port connection */
                  onMouseUp={(e) => {
                    if (isDragging.current && dragSourceRef.current) {
                      handleConnectionEnd(node.id)
                    }
                  }}
                >
                  <MessageNode
                    data={nodeData}
                    isActive={activeNodeId === node.id}
                    connected={
                      edges.some(e => e.from === node.id && !e.sourceHandleId) ||
                      (showLine && dragSourceRef.current === node.id && !dragHandleRef.current)
                    }
                    connectedHandles={connectedHandles}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveNodeId(node.id)
                    }}
                    onPortMouseDown={(e, handleId) => handlePortMouseDown(e, node.id, handleId)}
                    onPortClick={(e, handleId) => handlePortClick(e, node.id, handleId)}
                  />
                </div>
              )
            } else if (node.type === 'playbook_reference') {
              const pbNode = node as PlaybookReferenceNodeData
              const connectedHandles = new Set(
                edges
                  .filter(e => e.from === node.id && e.sourceHandleId)
                  .map(e => e.sourceHandleId!)
              )
              return (
                <div
                  key={node.id}
                  className="absolute z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  /* Input port: completes a pending port-to-port connection */
                  onMouseUp={(e) => {
                    if (isDragging.current && dragSourceRef.current) {
                      handleConnectionEnd(node.id)
                    }
                  }}
                >
                  <PlaybookReferenceNode
                    id={pbNode.id}
                    playbookId={pbNode.playbookId}
                    isActive={activeNodeId === node.id}
                    connectedHandles={connectedHandles}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveNodeId(node.id)
                    }}
                    onPortMouseDown={(e, handleId) => handlePortMouseDown(e, node.id, handleId)}
                    onPortClick={(e, handleId) => handlePortClick(e, node.id, handleId)}
                  />
                </div>
              )
            } else if (node.type === 'agent') {
              const agNode = node as AgentNodeData
              const connectedHandles = new Set(
                edges
                  .filter(e => e.from === node.id && e.sourceHandleId)
                  .map(e => e.sourceHandleId!)
              )
              return (
                <div
                  key={node.id}
                  className="absolute z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  /* Input port: completes a pending port-to-port connection */
                  onMouseUp={(e) => {
                    if (isDragging.current && dragSourceRef.current) {
                      handleConnectionEnd(node.id)
                    }
                  }}
                >
                  <AgentNode
                    id={agNode.id}
                    agentId={agNode.agentId}
                    isActive={activeNodeId === node.id}
                    connectedHandles={connectedHandles}
                    hasIncoming={edges.some(e => e.to === node.id)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveNodeId(node.id)
                    }}
                    onPortMouseDown={(e, handleId) => handlePortMouseDown(e, node.id, handleId)}
                    onPortClick={(e, handleId) => handlePortClick(e, node.id, handleId)}
                    onAgentSelect={(newAgentId) => handleAgentSelect(node.id, newAgentId)}
                    onDelete={(id) => handleDeleteNode(id)}
                  />
                </div>
              )
            }
            return null
          })}

          {/* ── Actions Dropdown — floats at the drag endpoint ────────────────── */}
          {showDropdown && (
            <div
              className="absolute z-30"
              style={{
                left: toPt.x + 16,
                top: toPt.y,
                transform: "translateY(-50%)",
                animation: "fadeSlideIn 180ms ease forwards",
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()} // Prevent pan when clicking dropdown
            >
              <ActionsDropdown
                onClose={handleDismiss}
                onActionSelect={handleActionSelect}
              />
            </div>
          )}

          {/* ── Playbook Picker Modal — appears at drop point ─────────────────── */}
          {playbookPickerPos && (
            <div
              className="absolute z-40"
              style={{
                left: playbookPickerPos.x,
                top: playbookPickerPos.y,
                transform: 'translateY(-50%)',
                animation: 'fadeSlideIn 180ms ease forwards',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <PlaybookPickerModal
                playbooks={allPlaybooks}
                onPick={handlePlaybookPick}
                onClose={() => setPlaybookPickerPos(null)}
                onCreateNew={() => {
                  const nb = createPlaybook(blankPlaybook())
                  handlePlaybookPick(nb.id)
                }}
              />
            </div>
          )}

          {/* ── Agent Picker Modal — appears at drop point ────────────────────── */}
          {agentPickerPos && (
            <div
              className="absolute z-40"
              style={{
                left: agentPickerPos.x,
                top: agentPickerPos.y,
                transform: 'translateY(-50%)',
                animation: 'fadeSlideIn 180ms ease forwards',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <AgentPickerModal
                agents={allAgentsList}
                onPick={(id) => handleAgentPick(id)}
                onClose={() => { setAgentPickerPos(null); handleDismiss() }}
                onCreateNew={async () => {
                  const now = new Date().toISOString()
                  const newId = generateAgentId()
                  const newAgent = {
                    id: newId,
                    title: 'Untitled Agent',
                    model: 'gpt-4o-mini' as const,
                    credentialId: null,
                    instructions: '',
                    tools: createDefaultTools(),
                    knowledgeBase: { isConfigured: false, documents: [] },
                    exitConditions: [],
                    createdAt: now,
                    updatedAt: now,
                    status: 'draft' as const,
                  }
                  // Persist to Supabase first so node can find it on reload
                  await persistAgent(newAgent)
                  // Load it into in-memory store
                  createAgent({ id: newId, title: 'Untitled Agent' })
                  handleAgentPick(newId)
                }}
              />
            </div>
          )}
        </div>

        {/* ── Top Header Action Bar ─────────────────────────────────────────── */}
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow transition hover:bg-gray-50">
            <Plus className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white shadow">
            M
          </div>
          {/* Widget Script Button */}
          <button
            onClick={() => setShowWidgetScriptModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
          >
            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            Widget Script
          </button>
          {/* Design Chat Button */}
          <button
            onClick={() => setShowDesignPanel(prev => !prev)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium shadow transition active:scale-95 ${
              showDesignPanel
                ? "bg-purple-600 text-white hover:bg-purple-700"
                : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Design Chat
          </button>
          <button
            onClick={() => {
              // Show the local RunModal as before
              setShowRunModal(true)
            }}
            className="flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-blue-600 active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            Run
          </button>
          <div className="flex overflow-hidden rounded-full shadow relative">
            <button 
              onClick={async () => {
                if (!activeWorkflowId || isPublishing) return;
                setIsPublishing(true);
                const success = await publishWorkflow(activeWorkflowId);
                setIsPublishing(false);
                if (success) {
                  setPublishSuccess(true);
                  setTimeout(() => setPublishSuccess(false), 2000);
                }
              }}
              className="flex items-center gap-1.5 bg-green-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-75"
            >
              {isPublishing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : publishSuccess ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 2l6 6-6 6M2 8h12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {publishSuccess ? "Published!" : "Publish"}
            </button>
            <button className="flex items-center border-l border-green-400 bg-green-500 px-2 py-1.5 text-white transition hover:bg-green-600">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow transition hover:bg-gray-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Design Chat Panel ────────────────────────────────────────────── */}
        {showDesignPanel && (
          <ChatDesignPanel onClose={() => setShowDesignPanel(false)} />
        )}

        {/* ── Settings Panel ─────────────────────────────────────────────────── */}
        {(() => {
          const activeNode = nodes.find(n => n.id === activeNodeId)
          if (activeNode?.type === "message") {
            return (
              <MessageSettingsPanel
                variants={activeNode.variants}
                waitForInput={activeNode.waitForInput}
                saveEntireReply={activeNode.saveEntireReply ?? false}
                buttons={activeNode.buttons ?? []}
                onChangeVariants={(variants) => handleNodeUpdate({ ...activeNode, variants })}
                onChangeWait={(waitForInput) => handleNodeUpdate({ ...activeNode, waitForInput })}
                onChangeSaveReply={(saveEntireReply) => handleNodeUpdate({ ...activeNode, saveEntireReply })}
                onChangeButtons={(buttons: NodeButton[]) => {
                  handleNodeUpdate({ ...activeNode, buttons })
                  // Clean up edges for deleted buttons
                  const buttonIds = new Set(buttons.map(b => b.id))
                  setEdges(prev =>
                    prev.filter(e =>
                      e.from !== activeNode.id ||
                      !e.sourceHandleId ||
                      buttonIds.has(e.sourceHandleId)
                    )
                  )
                }}
                onDelete={() => {
                  setNodes(prev => prev.filter(n => n.id !== activeNode.id))
                  setEdges(prev => prev.filter(e => e.from !== activeNode.id && e.to !== activeNode.id))
                  setActiveNodeId(null)
                }}
              />
            )
          }
          return null
        })()}


        {/* ── Node Library ─────────────────────────────────────────────────── */}
        <div className="absolute left-4 top-1/2 z-20 -translate-y-1/2">
          <NodeLibrary />
        </div>

        {/* ── Bottom Utility Bar ───────────────────────────────────────────── */}
        <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 shadow-lg">
            <ToolbarBtn label="Pan/Zoom"><Move className="h-4 w-4" /></ToolbarBtn>
            <ToolbarBtn label="Mini-map"><Map className="h-4 w-4" /></ToolbarBtn>
            <ToolbarBtn label="Chat"><MessageCircle className="h-4 w-4" /></ToolbarBtn>
            <ToolbarBtn label="Assets"><ImageIcon className="h-4 w-4" /></ToolbarBtn>
          </div>
        </div>
      </div>

      {/* Global keyframe */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-50%) translateX(-6px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0);    }
        }
      `}</style>

      {/* ── Run Modal ─────────────────────────────────────────────────────────── */}
      {showRunModal && (
        <RunModal
          nodes={nodes as MessageNodeData[]}
          edges={edges}
          agentsMap={allAgents}
          onClose={() => setShowRunModal(false)}
        />
      )}

      {/* ── Agent Studio — full-screen modal, outside panning layer ─────────── */}
      <AgentStudio />

      {/* ── Widget Script Modal ─────────────────────────────────────────────────── */}
      {showWidgetScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[500px] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-800">Widget Script</h2>
              <button onClick={() => setShowWidgetScriptModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Copiez ce code et collez-le dans la balise <code>&lt;head&gt;</code> ou juste avant la fin de la balise <code>&lt;body&gt;</code> de votre site web pour ajouter le widget de chat.
              </p>
              <div className="relative">
                <pre className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap">
{`<script src="\${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget-loader.js"></script>
<script>
  window.initAIChatbot({
    host: "\${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}",
    projectId: "${activeWorkflowId || 'default'}"
  });
</script>`}
                </pre>
                <button
                  onClick={() => {
                    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                    navigator.clipboard.writeText(`<script src="${host}/widget-loader.js"></script>\n<script>\n  window.initAIChatbot({\n    host: "${host}",\n    projectId: "${activeWorkflowId || 'default'}"\n  });\n</script>`)
                    alert("Script copié dans le presse-papiers !")
                  }}
                  className="absolute top-3 right-3 rounded-md bg-white border border-gray-200 p-1.5 shadow-sm hover:bg-gray-50 text-gray-500"
                  title="Copier"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </button>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-100">
              <button onClick={() => setShowWidgetScriptModal(false)} className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}

/**
 * CanvasFlowPage — public export.
 * Wraps CanvasFlowPageInner in AgentStoreProvider so every agent node
 * on this canvas shares one isolated store that is never accessible
 * from outside this canvas subtree.
 */
export default function CanvasFlowPage() {
  return (
    <ChatThemeProvider>
      <AgentStoreProvider>
        <CanvasFlowPageInner />
      </AgentStoreProvider>
    </ChatThemeProvider>
  )
}

function ToolbarBtn({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PlaybookPickerModal — appears at the drop point to assign a playbook
// ─────────────────────────────────────────────────────────────────────────────

function PlaybookPickerModal({
  playbooks,
  onPick,
  onClose,
  onCreateNew,
}: {
  playbooks: Playbook[]
  onPick: (playbookId: string) => void
  onClose: () => void
  onCreateNew: () => void
}) {
  return (
    <div className="w-64 rounded-xl bg-[#1c1f28] border border-white/10 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-semibold text-white">Pick a Playbook</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white transition">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Playbook list */}
      <ul className="max-h-56 overflow-y-auto py-1">
        {playbooks.length === 0 && (
          <li className="px-4 py-3 text-xs text-white/30 italic">No playbooks yet.</li>
        )}
        {playbooks.map(pb => (
          <li key={pb.id}>
            <button
              onClick={() => onPick(pb.id)}
              className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition hover:bg-violet-600/12"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3 w-3 shrink-0 text-violet-400" />
                <span className="truncate text-xs font-semibold text-white/80">{pb.title}</span>
                <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${pb.status === 'published' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-amber-900/30 text-amber-400'}`}>
                  {pb.status}
                </span>
              </div>
              {pb.trigger && (
                <p className="truncate pl-5 text-[10px] text-white/30">{pb.trigger}</p>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Create new shortcut */}
      <div className="border-t border-white/8 p-2">
        <button
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-violet-500/30 py-2 text-xs font-medium text-violet-400/70 transition hover:border-violet-500/60 hover:text-violet-400"
        >
          <Plus className="h-3 w-3" />
          Create new playbook
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AgentPickerModal — appears at drop point to assign a Supabase agent
// ─────────────────────────────────────────────────────────────────────────────

function AgentPickerModal({
  agents,
  onPick,
  onClose,
  onCreateNew,
}: {
  agents: AgentConfig[]
  onPick: (agentId: string) => void
  onClose: () => void
  onCreateNew: () => void
}) {
  return (
    <div className="w-64 rounded-xl bg-[#1c1f28] border border-white/10 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-white">Pick an Agent</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white transition">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Agent list */}
      <ul className="max-h-56 overflow-y-auto py-1">
        {agents.length === 0 && (
          <li className="px-4 py-3 text-xs text-white/30 italic text-center">
            No agents in your workspace yet.
          </li>
        )}
        {agents.map(a => (
          <li key={a.id}>
            <button
              onClick={() => onPick(a.id)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-blue-600/12"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <span className="flex-1 truncate text-xs font-semibold text-white/80">{a.title}</span>
              <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${a.status === 'published'
                  ? 'bg-emerald-900/40 text-emerald-400'
                  : 'bg-amber-900/30 text-amber-400'
                }`}>
                {a.status}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Create new shortcut */}
      <div className="border-t border-white/8 p-2">
        <button
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-blue-500/30 py-2 text-xs font-medium text-blue-400/70 transition hover:border-blue-500/60 hover:text-blue-400"
        >
          <Plus className="h-3 w-3" />
          Create new agent
        </button>
      </div>
    </div>
  )
}
