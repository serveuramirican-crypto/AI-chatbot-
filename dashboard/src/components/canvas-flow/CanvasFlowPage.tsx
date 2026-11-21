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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  PanelLeftClose,
  PanelLeftOpen,
  Code,
  HelpCircle,
  Copy,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react"
import StartNode from "./StartNode"
import ActionsDropdown from "./ActionsDropdown"
import NodeLibrary from "./NodeLibrary"
import MessageNode, {
  MessageNodeData,
  NodeButton,
  MSG_WIDTH,
  MSG_NODE_HEADER_H,
  MSG_NODE_BODY_H,
} from "./MessageNode"
import MessageSettingsPanel from "./MessageSettingsPanel"
import RunModal from "./RunModal"
import ChatDesignPanel, { ChatThemeProvider } from "./ChatDesignPanel"
import CanvasEdges, { START_WIDTH, START_HEIGHT } from "./CanvasEdges"
import CarouselNode, { CarouselNodeData } from "./CarouselNode"
import CarouselSettingsPanel from "./CarouselSettingsPanel"
import PlaybookReferenceNode from "./PlaybookReferenceNode"
import AgentNode from "./AgentNode"
import AgentStudio from "./AgentStudio"
import {
  AgentStoreProvider,
  useAgentActions,
  useAgents,
  useAgentBootstrap,
  useAgentList,
  persistAgent,
  generateAgentId,
  createDefaultTools,
} from "@/lib/agentStore"
import { usePlaybooks, usePlaybookActions, blankPlaybook } from "@/lib/playbookStore"
import type { PlaybookReferenceNodeData, Playbook } from "@/types/playbook"
import type { AgentNodeData, AgentConfig } from "@/types/agent"
import {
  type WorkflowMeta,
  type WorkflowRow,
  listWorkflows,
  loadWorkflow,
  createWorkflow,
  deleteWorkflow,
  renameWorkflow,
  useWorkflowPersistence,
  publishWorkflow,
} from "@/lib/workflowStore"

import ApiNode, { ApiNodeData } from "./ApiNode"
import ApiSettingsPanel from "./ApiSettingsPanel"
import ApiConfigModal from "./ApiConfigModal"

// ── Types ─────────────────────────────────────────────────────────────────────
type FlowNode =
  | MessageNodeData
  | PlaybookReferenceNodeData
  | AgentNodeData
  | CarouselNodeData
  | ApiNodeData

interface Point {
  x: number
  y: number
}

interface Edge {
  id: string
  from: string
  to: string
  sourceHandleId?: string
}

type FlowState = "idle" | "dragging" | "open"

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

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
  const [workflowSearch, setWorkflowSearch] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [isWorkflowsOpen, setIsWorkflowsOpen] = useState(true)

  /** Picker modals */
  const [playbookPickerPos, setPlaybookPickerPos] = useState<{
    x: number
    y: number
    sourceId?: string
    handleId?: string
  } | null>(null)

  const [agentPickerPos, setAgentPickerPos] = useState<{
    x: number
    y: number
    sourceId?: string
    handleId?: string
  } | null>(null)

  const [flowState, setFlowState] = useState<FlowState>("idle")
  const [fromPt, setFromPt] = useState<Point>({ x: 0, y: 0 })
  const [toPt, setToPt] = useState<Point>({ x: 0, y: 0 })

  // Nodes & Edges State
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [editingApiNodeId, setEditingApiNodeId] = useState<string | null>(null)
  const [showRunModal, setShowRunModal] = useState(false)
  const [showDesignPanel, setShowDesignPanel] = useState(false)
  const [showWidgetScriptModal, setShowWidgetScriptModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showMinimap, setShowMinimap] = useState(false)
  const [gridMode, setGridMode] = useState<"dots" | "cross" | "clean">("dots")
  const [startNodePos, setStartNodePos] = useState<Point>({ x: 340, y: 280 })

  // ── Pending connection (direct port-to-port drag) ─────────────────────────
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string
    sourceHandleId?: string
    mouseX: number
    mouseY: number
  } | null>(null)

  // Carousel computed offsets
  const [carouselOffsets, setCarouselOffsets] = useState<Record<string, Record<string, number>>>({})
  const handleCarouselOffsetsUpdate = useCallback(
    (nodeId: string, offsets: Record<string, number>) => {
      setCarouselOffsets((prev) => ({ ...prev, [nodeId]: offsets }))
    },
    []
  )

  // Pan & Zoom state
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const panRef = useRef<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1.0)
  const zoomRef = useRef<number>(1.0)
  const [isPanningState, setIsPanningState] = useState(false)

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragSourceRef = useRef<string | null>(null)
  const dragHandleRef = useRef<string | undefined>(undefined)
  const isDraggingNode = useRef<string | null>(null)
  const isDragging = useRef(false)
  const isPanning = useRef(false)
  const hasDragged = useRef(false)
  const lastMousePos = useRef<Point>({ x: 0, y: 0 })
  const nodesRef = useRef<FlowNode[]>([])
  const justReleased = useRef(false)

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [isPublished, setIsPublished] = useState<boolean | null>(null)

  // ── Bootstrap: load workflow list on mount ─────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      let wfs = await listWorkflows()
      if (wfs.length === 0) {
        const newId = await createWorkflow("Untitled workflow")
        wfs = await listWorkflows()
        setActiveWorkflowId(newId)
      } else {
        setActiveWorkflowId(wfs[0].id)
      }
      setWorkflows(wfs)
    }
    bootstrap()
  }, [])

  // ── Check if active workflow has been published ──────────────────────────────
  useEffect(() => {
    if (!activeWorkflowId) {
      setIsPublished(null)
      return
    }
    setIsPublished(null)
    loadWorkflow(`${activeWorkflowId}_published`)
      .then((row) => {
        setIsPublished(!!row)
      })
      .catch(() => setIsPublished(false))
  }, [activeWorkflowId, publishSuccess])

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
    const newId = await createWorkflow("Untitled workflow")
    const wfs = await listWorkflows()
    setWorkflows(wfs)
    setNodes([])
    setEdges([])
    setStartNodePos({ x: 340, y: 280 })
    setActiveWorkflowId(newId)
  }, [])

  const handleSwitchWorkflow = useCallback(
    (id: string) => {
      if (id === activeWorkflowId) return
      setActiveWorkflowId(id)
    },
    [activeWorkflowId]
  )

  const handleDeleteWorkflow = useCallback(
    async (id: string) => {
      await deleteWorkflow(id)
      const wfs = await listWorkflows()
      setWorkflows(wfs)
      if (id === activeWorkflowId) {
        if (wfs.length > 0) {
          setActiveWorkflowId(wfs[0].id)
        } else {
          const newId = await createWorkflow("Untitled workflow")
          const refreshed = await listWorkflows()
          setWorkflows(refreshed)
          setActiveWorkflowId(newId)
        }
      }
    },
    [activeWorkflowId]
  )

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }, [])

  const handleCommitRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null)
      return
    }
    await renameWorkflow(renamingId, renameValue.trim())
    setWorkflows((prev) =>
      prev.map((w) => (w.id === renamingId ? { ...w, name: renameValue.trim() } : w))
    )
    setRenamingId(null)
  }, [renamingId, renameValue])

  // ── World Coordinate Converter (respects pan & zoom) ────────────────────────
  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
    return {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - panRef.current.y) / zoomRef.current,
    }
  }, [])

  // ── Mouse & Drag handlers ───────────────────────────────────────────────────
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return
    e.stopPropagation()
    isDraggingNode.current = nodeId
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePortMouseDown = useCallback(
    (e: React.MouseEvent, sourceId: string, handleId?: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (flowState !== "idle") return

      isDragging.current = true
      justReleased.current = false
      dragSourceRef.current = sourceId
      dragHandleRef.current = handleId

      let from = { x: 0, y: 0 }
      if (sourceId === "start") {
        from = {
          x: startNodePos.x + START_WIDTH,
          y: startNodePos.y + START_HEIGHT / 2,
        }
      } else {
        const n = nodes.find((x) => x.id === sourceId)
        if (n) {
          from = {
            x: n.position.x + MSG_WIDTH,
            y: n.position.y + (MSG_NODE_HEADER_H + MSG_NODE_BODY_H / 2),
          }
        }
      }

      const to = toWorld(e.clientX, e.clientY)
      setFromPt(from)
      setToPt(to)
      setFlowState("dragging")
    },
    [flowState, toWorld, nodes, startNodePos]
  )

  const handlePortClick = useCallback(
    (e: React.MouseEvent, sourceId: string, handleId?: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (flowState !== "idle") return

      dragSourceRef.current = sourceId
      dragHandleRef.current = handleId
      justReleased.current = false

      let from = { x: 0, y: 0 }
      if (sourceId === "start") {
        from = {
          x: startNodePos.x + START_WIDTH,
          y: startNodePos.y + START_HEIGHT / 2,
        }
      } else {
        const n = nodes.find((x) => x.id === sourceId)
        if (n) {
          from = {
            x: n.position.x + MSG_WIDTH,
            y: n.position.y + (MSG_NODE_HEADER_H + MSG_NODE_BODY_H / 2),
          }
        }
      }

      const dropdownPt = { x: from.x + 96, y: from.y }
      setFromPt(from)
      setToPt(dropdownPt)
      setFlowState("open")
    },
    [flowState, nodes, startNodePos]
  )

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      if (flowState === "dragging") return

      isPanning.current = true
      setIsPanningState(true)
      hasDragged.current = false
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    },
    [flowState]
  )

  // ── Wheel Zoom & Pan Handler ───────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.08 : -0.08
      setZoom((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.4), 2.0))
    } else {
      const newPan = {
        x: panRef.current.x - e.deltaX,
        y: panRef.current.y - e.deltaY,
      }
      panRef.current = newPan
      setPan(newPan)
    }
  }, [])

  // ── Zoom Toolbar Helpers ────────────────────────────────────────────────────
  const handleZoomIn = () => setZoom((z) => Math.min(Number((z + 0.1).toFixed(2)), 2.0))
  const handleZoomOut = () => setZoom((z) => Math.max(Number((z - 0.1).toFixed(2)), 0.4))
  const handleResetZoom = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
    panRef.current = { x: 0, y: 0 }
  }

  const handleFitView = () => {
    if (nodes.length === 0) {
      handleResetZoom()
      return
    }
    const allX = [startNodePos.x, ...nodes.map((n) => n.position.x)]
    const allY = [startNodePos.y, ...nodes.map((n) => n.position.y)]
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX) + MSG_WIDTH
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY) + 200

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const padding = 120
    const availableW = rect.width - padding * 2
    const availableH = rect.height - padding * 2

    const flowW = maxX - minX
    const flowH = maxY - minY
    const scale = Math.min(Math.max(Math.min(availableW / flowW, availableH / flowH), 0.5), 1.2)

    const centerX = minX + flowW / 2
    const centerY = minY + flowH / 2

    const newPan = {
      x: rect.width / 2 - centerX * scale,
      y: rect.height / 2 - centerY * scale,
    }

    setZoom(Number(scale.toFixed(2)))
    setPan(newPan)
    panRef.current = newPan
  }

  // ── Global mousemove & mouseup listeners ────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingNode.current) {
        const dx = (e.clientX - lastMousePos.current.x) / zoomRef.current
        const dy = (e.clientY - lastMousePos.current.y) / zoomRef.current

        if (isDraggingNode.current === "start") {
          setStartNodePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
        } else {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === isDraggingNode.current
                ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
                : n
            )
          )
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

    const onUp = () => {
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
        isDragging.current = false
        justReleased.current = true
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

  const handleDismiss = useCallback(() => {
    isDragging.current = false
    setFlowState("idle")
  }, [])

  // ── HTML5 drag-drop from NodeLibrary ─────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const actionType = e.dataTransfer.getData("actionType")
      if (!actionType) return

      const position = toWorld(e.clientX, e.clientY)

      if (actionType === "playbook_reference") {
        setPlaybookPickerPos({ x: position.x, y: position.y })
        return
      }

      if (actionType === "agent") {
        setAgentPickerPos({ x: position.x, y: position.y })
        return
      }

      if (actionType === "Capture") {
        const targetNode = nodesRef.current.find((n) => {
          if (n.type !== "message") return false
          const w = MSG_WIDTH
          const h = 160
          return (
            position.x >= n.position.x &&
            position.x <= n.position.x + w &&
            position.y >= n.position.y &&
            position.y <= n.position.y + h
          )
        })

        if (targetNode) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === targetNode.id ? ({ ...n, saveEntireReply: true } as FlowNode) : n
            )
          )
          setActiveNodeId(targetNode.id)
          return
        }

        const newNode: FlowNode = {
          id: generateId(),
          type: "message",
          variants: ["Wait for reply"],
          waitForInput: true,
          saveEntireReply: true,
          buttons: [],
          position,
        }
        setNodes((prev) => [...prev, newNode])
        setActiveNodeId(newNode.id)
        return
      }

      const newNode: FlowNode = {
        id: generateId(),
        type: "message",
        variants: [actionType === "chat_input" ? "Waiting for user message..." : actionType],
        waitForInput: true,
        buttons: [],
        position,
      }

      const isFirstMessageNode = nodesRef.current.length === 0
      setNodes((prev) => [...prev, newNode])

      if (isFirstMessageNode) {
        const autoEdge: Edge = {
          id: generateId(),
          from: "start",
          to: newNode.id,
        }
        setEdges((prev) => {
          if (prev.some((ed) => ed.to === newNode.id)) return prev
          return [...prev, autoEdge]
        })
      }

      setActiveNodeId(newNode.id)
    },
    [toWorld]
  )

  const handlePlaybookPick = useCallback(
    (playbookId: string) => {
      if (!playbookPickerPos) return
      const { x, y, sourceId, handleId } = playbookPickerPos

      const newNode: PlaybookReferenceNodeData = {
        id: generateId(),
        type: "playbook_reference",
        position: { x, y },
        playbookId,
      }
      setNodes((prev) => [...prev, newNode])
      setActiveNodeId(newNode.id)

      if (sourceId) {
        setEdges((prev) => [
          ...prev,
          {
            id: generateId(),
            from: sourceId,
            to: newNode.id,
            ...(handleId ? { sourceHandleId: handleId } : {}),
          },
        ])
      }

      setPlaybookPickerPos(null)
      dragSourceRef.current = null
      dragHandleRef.current = undefined
      handleDismiss()
    },
    [playbookPickerPos, handleDismiss]
  )

  const handleAgentPick = useCallback(
    async (pickedAgentId: string) => {
      if (!agentPickerPos) return
      const { x, y, sourceId, handleId } = agentPickerPos

      const newNode: AgentNodeData = {
        id: generateId(),
        type: "agent",
        position: { x, y },
        agentId: pickedAgentId,
      }

      const isFirst = nodesRef.current.length === 0
      setNodes((prev) => [...prev, newNode])
      setActiveNodeId(newNode.id)

      if (sourceId) {
        setEdges((prev) => [
          ...prev,
          {
            id: generateId(),
            from: sourceId,
            to: newNode.id,
            ...(handleId ? { sourceHandleId: handleId } : {}),
          },
        ])
      } else if (isFirst) {
        setEdges((prev) => {
          if (prev.some((ed) => ed.to === newNode.id)) return prev
          return [...prev, { id: generateId(), from: "start", to: newNode.id }]
        })
      }

      setAgentPickerPos(null)
      dragSourceRef.current = null
      dragHandleRef.current = undefined
      handleDismiss()
    },
    [agentPickerPos, handleDismiss]
  )

  const handleAgentSelect = useCallback((nodeId: string, newAgentId: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? ({ ...n, agentId: newAgentId } as AgentNodeData) : n
      )
    )
  }, [])

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setEdges((prev) => prev.filter((e) => e.from !== nodeId && e.to !== nodeId))
      if (activeNodeId === nodeId) {
        setActiveNodeId(null)
      }
    },
    [activeNodeId]
  )

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

  // ── Action Select from Dropdown ──────────────────────────────────────────────
  const handleActionSelect = useCallback(
    (label: string) => {
      if (label === "Message") {
        const newNode: MessageNodeData = {
          id: `msg_${Date.now()}`,
          type: "message",
          variants: [""],
          waitForInput: true,
          buttons: [],
          position: { x: toPt.x, y: toPt.y - 40 },
        }
        setNodes((prev) => [...prev, newNode])
        setActiveNodeId(newNode.id)

        if (dragSourceRef.current) {
          const newEdge = {
            id: `edge_${Date.now()}`,
            from: dragSourceRef.current!,
            to: newNode.id,
            sourceHandleId: dragHandleRef.current,
          }
          setEdges((prev) => [...prev, newEdge])
          dragSourceRef.current = null
          dragHandleRef.current = undefined
        }
      } else if (label === "Carousel") {
        const newNode: CarouselNodeData = {
          id: `carousel_${Date.now()}`,
          type: "carousel",
          cards: [],
          position: { x: toPt.x, y: toPt.y - 40 },
        }
        setNodes((prev) => [...prev, newNode])
        setActiveNodeId(newNode.id)

        if (dragSourceRef.current) {
          const newEdge = {
            id: `edge_${Date.now()}`,
            from: dragSourceRef.current!,
            to: newNode.id,
            sourceHandleId: dragHandleRef.current,
          }
          setEdges((prev) => [...prev, newEdge])
          dragSourceRef.current = null
          dragHandleRef.current = undefined
        }
      } else if (label === "AI Agent") {
        setAgentPickerPos({
          x: toPt.x,
          y: toPt.y - 40,
          sourceId: dragSourceRef.current ?? undefined,
          handleId: dragHandleRef.current,
        })
        return
      } else if (label === "Playbook") {
        setPlaybookPickerPos({
          x: toPt.x,
          y: toPt.y - 40,
          sourceId: dragSourceRef.current ?? undefined,
          handleId: dragHandleRef.current,
        })
        return
      } else if (label === "API") {
        const newNode: ApiNodeData = {
          id: `api_${Date.now()}`,
          type: "api",
          name: "Untitled API",
          method: "GET",
          url: "",
          headers: [],
          params: [],
          body: [],
          timeout: 20,
          asyncExecution: false,
          captureResponse: false,
          failurePath: false,
          position: { x: toPt.x, y: toPt.y - 40 },
        }
        setNodes((prev) => [...prev, newNode])
        setActiveNodeId(newNode.id)

        if (dragSourceRef.current) {
          const newEdge = {
            id: `edge_${Date.now()}`,
            from: dragSourceRef.current!,
            to: newNode.id,
            sourceHandleId: dragHandleRef.current,
          }
          setEdges((prev) => [...prev, newEdge])
          dragSourceRef.current = null
          dragHandleRef.current = undefined
        }
      }
      handleDismiss()
    },
    [toPt, handleDismiss]
  )

  const handleNodeUpdate = useCallback((updatedNode: FlowNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)))
  }, [])

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId))
    setSelectedEdgeId(null)
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const showLine = flowState === "dragging"
  const showDropdown = flowState === "open"

  const _dx = Math.abs(toPt.x - fromPt.x)
  const _offset = Math.min(Math.max(_dx * 0.5, 80), 240)
  const pathD = `M ${fromPt.x} ${fromPt.y} C ${fromPt.x + _offset} ${fromPt.y}, ${toPt.x - _offset} ${toPt.y}, ${toPt.x} ${toPt.y}`

  const cursorStyle = isPanningState ? "grabbing" : flowState === "dragging" ? "crosshair" : "grab"

  // Active workflow metadata
  const activeWf = workflows.find((w) => w.id === activeWorkflowId)

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#0c0e14] text-slate-100 select-none">
      {/* ── Left Sidebar – Workflows Manager ──────────────────────────────── */}
      <aside
        className={`
          relative z-20 flex shrink-0 flex-col border-r border-white/5 bg-[#0f121a]
          transition-all duration-300 ease-in-out
          ${isWorkflowsOpen ? "w-[220px]" : "w-0 overflow-hidden border-none"}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold tracking-tight text-white/90">Workflows</span>
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-blue-400">
              {workflows.length}
            </span>
          </div>

          <button
            title="Create new workflow"
            onClick={handleCreateWorkflow}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 transition hover:bg-blue-600 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 px-2.5 py-1.5 focus-within:border-blue-500/50 focus-within:bg-white/10 transition">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <input
              type="text"
              placeholder="Search flows..."
              value={workflowSearch}
              onChange={(e) => setWorkflowSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-white/90 placeholder-white/30 outline-none"
            />
          </div>
        </div>

        {/* Workflow List */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {workflows
            .filter((w) => w.name.toLowerCase().includes(workflowSearch.toLowerCase()))
            .map((wf) => {
              const isActive = wf.id === activeWorkflowId
              return (
                <div
                  key={wf.id}
                  className={`
                    group relative flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-all
                    ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600/20 to-blue-600/5 text-white border border-blue-500/30 shadow-xs"
                        : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
                    }
                  `}
                >
                  {/* Left Active Glow Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  )}

                  <Workflow
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? "text-blue-400" : "text-white/40 group-hover:text-white/60"
                    }`}
                  />

                  {renamingId === wf.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleCommitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitRename()
                        if (e.key === "Escape") setRenamingId(null)
                      }}
                      className="min-w-0 flex-1 bg-white/10 text-xs font-medium text-white outline-none ring-1 ring-blue-500 rounded px-1.5 py-0.5"
                    />
                  ) : (
                    <button
                      className="min-w-0 flex-1 truncate text-xs font-medium text-left"
                      onClick={() => handleSwitchWorkflow(wf.id)}
                    >
                      {wf.name}
                    </button>
                  )}

                  {/* Actions */}
                  <div
                    className={`flex shrink-0 items-center gap-1 transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {renamingId === wf.id ? (
                      <button
                        title="Confirm rename"
                        onClick={handleCommitRename}
                        className="flex h-5 w-5 items-center justify-center rounded text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        title="Rename"
                        onClick={() => handleStartRename(wf.id, wf.name)}
                        className="flex h-5 w-5 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                    )}
                    <button
                      title="Delete workflow"
                      onClick={() => handleDeleteWorkflow(wf.id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-white/40 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          {workflows.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-white/30 italic">
              No workflows yet. Click + to create one.
            </div>
          )}
        </nav>
      </aside>

      {/* ── Main Canvas Viewport ─────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden"
        style={{ cursor: cursorStyle }}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onMouseMove={(e) => {
          if (pendingConnection) {
            const worldPt = toWorld(e.clientX, e.clientY)
            setPendingConnection((prev) =>
              prev ? { ...prev, mouseX: worldPt.x, mouseY: worldPt.y } : prev
            )
          }
        }}
        onMouseUp={() => {
          if (pendingConnection) handleConnectionCancel()
        }}
        onClick={() => {
          if (justReleased.current) {
            justReleased.current = false
            return
          }
          if (flowState === "open") handleDismiss()
          setActiveNodeId(null)
          setSelectedEdgeId(null)
        }}
      >
        {/* Modern Studio Background with Dotted Grid */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-75"
          style={{
            backgroundImage:
              gridMode === "dots"
                ? "radial-gradient(circle, #334155 1.2px, transparent 1.2px)"
                : gridMode === "cross"
                ? "linear-gradient(to right, rgba(51,65,85,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(51,65,85,0.2) 1px, transparent 1px)"
                : "none",
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Ambient Studio Radial Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59, 130, 246, 0.08), transparent 70%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(139, 92, 246, 0.06), transparent 70%)",
          }}
        />

        {/* ── Panning & Scaling Layer ─────────────────────────────────────────── */}
        <div
          className="absolute inset-0 w-full h-full origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Confirmed Edges */}
          <CanvasEdges
            edges={edges}
            nodes={nodes}
            startNodePos={startNodePos}
            selectedEdgeId={selectedEdgeId}
            onSelectEdge={setSelectedEdgeId}
            onDeleteEdge={handleDeleteEdge}
            getPlaybook={(id) => allPlaybooks.find((p) => p.id === id)}
            getAgent={(id) => allAgents[id]}
            carouselOffsets={carouselOffsets}
          />

          {/* Live Drag Ghost Line */}
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
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="6 4"
                markerEnd="url(#arrowhead-drag)"
                style={{ filter: "drop-shadow(0 0 6px rgba(96,165,250,0.6))" }}
              />
            </svg>
          )}

          {/* Pending Connection Line (Port-to-Port) */}
          {pendingConnection && (
            <svg
              className="absolute inset-0 pointer-events-none w-full h-full"
              overflow="visible"
              style={{ zIndex: 11 }}
            >
              <defs>
                <marker
                  id="arrowhead-pending"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L8,3 z" fill="#a78bfa" />
                </marker>
              </defs>
              {(() => {
                let sx = 0
                let sy = 0
                if (pendingConnection.sourceId === "start") {
                  sx = startNodePos.x + START_WIDTH
                  sy = startNodePos.y + START_HEIGHT / 2
                } else {
                  const sn = nodes.find((n) => n.id === pendingConnection.sourceId)
                  if (sn) {
                    sx = sn.position.x + MSG_WIDTH
                    sy = sn.position.y + (MSG_NODE_HEADER_H + MSG_NODE_BODY_H / 2)
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
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray="6 4"
                    markerEnd="url(#arrowhead-pending)"
                    style={{ filter: "drop-shadow(0 0 6px rgba(167,139,250,0.6))" }}
                  />
                )
              })()}
            </svg>
          )}

          {/* ── Start Node ────────────────────────────────────────────────────── */}
          <div
            className="absolute z-20 cursor-grab active:cursor-grabbing"
            style={{
              left: startNodePos.x,
              top: startNodePos.y + START_HEIGHT / 2,
              transform: "translateY(-50%)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => handleNodeMouseDown(e, "start")}
            onMouseUp={() => {
              if (isDragging.current && dragSourceRef.current) {
                handleConnectionEnd("start")
              }
            }}
          >
            <StartNode
              onPortMouseDown={(e) => handlePortMouseDown(e, "start")}
              onPortClick={(e) => handlePortClick(e, "start")}
              connected={
                edges.some((edge) => edge.from === "start") ||
                (showLine && dragSourceRef.current === "start")
              }
            />
          </div>

          {/* ── Render Nodes ──────────────────────────────────────────────────── */}
          {nodes.map((node) => {
            if (node.type === "message") {
              const nodeData = node as MessageNodeData
              const connectedHandles = new Set(
                edges
                  .filter((e) => e.from === node.id && e.sourceHandleId)
                  .map((e) => e.sourceHandleId!)
              )
              return (
                <div
                  key={node.id}
                  className="absolute z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={() => {
                    if (isDragging.current && dragSourceRef.current) {
                      handleConnectionEnd(node.id)
                    }
                  }}
                >
                  <MessageNode
                    data={nodeData}
                    isActive={activeNodeId === node.id}
                    connected={
                      edges.some((e) => e.from === node.id && !e.sourceHandleId) ||
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
            } else if (node.type === "playbook_reference") {
              const pbNode = node as PlaybookReferenceNodeData
              const connectedHandles = new Set(
                edges
                  .filter((e) => e.from === node.id && e.sourceHandleId)
                  .map((e) => e.sourceHandleId!)
              )
              return (
                <div
                  key={node.id}
                  className="absolute z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={() => {
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
            } else if (node.type === "agent") {
              const agNode = node as AgentNodeData
              const connectedHandles = new Set(
                edges
                  .filter((e) => e.from === node.id && e.sourceHandleId)
                  .map((e) => e.sourceHandleId!)
              )
              return (
                <div
                  key={node.id}
                  className="absolute z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={() => {
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
                    hasIncoming={edges.some((e) => e.to === node.id)}
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
            } else if (node.type === "carousel") {
              const carouselNode = node as CarouselNodeData
              const connectedHandles = new Set(
                edges
                  .filter((e) => e.from === node.id && e.sourceHandleId)
                  .map((e) => e.sourceHandleId!)
              )
              return (
                <div
                  key={node.id}
                  className="absolute z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={() => {
                    if (isDragging.current && dragSourceRef.current) {
                      handleConnectionEnd(node.id)
                    }
                  }}
                >
                  <CarouselNode
                    data={carouselNode}
                    isActive={activeNodeId === node.id}
                    connectedHandles={connectedHandles}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveNodeId(node.id)
                    }}
                    onPortMouseDown={(e, handleId) => handlePortMouseDown(e, node.id, handleId)}
                    onPortClick={(e, handleId) => handlePortClick(e, node.id, handleId)}
                    onUpdateOffsets={handleCarouselOffsetsUpdate}
                  />
                </div>
              )
            } else if (node.type === "api") {
              const apiNode = node as ApiNodeData
              const connectedHandles = new Set(
                edges
                  .filter((e) => e.from === node.id && e.sourceHandleId)
                  .map((e) => e.sourceHandleId!)
              )
              return (
                <div
                  key={node.id}
                  className="absolute z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onMouseUp={() => {
                    if (isDragging.current && dragSourceRef.current) {
                      handleConnectionEnd(node.id)
                    }
                  }}
                >
                  <ApiNode
                    data={apiNode}
                    isActive={activeNodeId === node.id}
                    connected={
                      edges.some((e) => e.from === node.id && !e.sourceHandleId) ||
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
            }
            return null
          })}

          {/* Actions Dropdown */}
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
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ActionsDropdown onClose={handleDismiss} onActionSelect={handleActionSelect} />
            </div>
          )}

          {/* Playbook Picker Modal */}
          {playbookPickerPos && (
            <div
              className="absolute z-40"
              style={{
                left: playbookPickerPos.x,
                top: playbookPickerPos.y,
                transform: "translateY(-50%)",
                animation: "fadeSlideIn 180ms ease forwards",
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

          {/* Agent Picker Modal */}
          {agentPickerPos && (
            <div
              className="absolute z-40"
              style={{
                left: agentPickerPos.x,
                top: agentPickerPos.y,
                transform: "translateY(-50%)",
                animation: "fadeSlideIn 180ms ease forwards",
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <AgentPickerModal
                agents={allAgentsList}
                onPick={(id) => handleAgentPick(id)}
                onClose={() => {
                  setAgentPickerPos(null)
                  handleDismiss()
                }}
                onCreateNew={async () => {
                  const now = new Date().toISOString()
                  const newId = generateAgentId()
                  const newAgent = {
                    id: newId,
                    title: "Untitled Agent",
                    model: "gpt-4o-mini" as const,
                    credentialId: null,
                    instructions: "",
                    tools: createDefaultTools(),
                    knowledgeBase: { isConfigured: false, documents: [] },
                    exitConditions: [],
                    createdAt: now,
                    updatedAt: now,
                    status: "draft" as const,
                  }
                  await persistAgent(newAgent)
                  createAgent({ id: newId, title: "Untitled Agent" })
                  handleAgentPick(newId)
                }}
              />
            </div>
          )}
        </div>

        {/* ── Top Header Action Bar ─────────────────────────────────────────── */}
        <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
          {/* Left: Workflow Title & Status */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setIsWorkflowsOpen(!isWorkflowsOpen)}
              title={isWorkflowsOpen ? "Collapse Workflows Sidebar" : "Expand Workflows Sidebar"}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f121a]/90 backdrop-blur-xl border border-white/10 text-white/70 hover:bg-white/10 hover:text-white shadow-xl transition active:scale-95"
            >
              {isWorkflowsOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-2.5 rounded-xl bg-[#0f121a]/90 backdrop-blur-xl border border-white/10 px-3 py-1.5 shadow-xl">
              <span className="text-xs font-bold text-white/90">
                {activeWf?.name || "Untitled workflow"}
              </span>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2 py-0.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isPublished ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <span className="text-[10px] font-semibold text-white/70">
                  {isPublished ? "Live" : "Draft"}
                </span>
              </div>

              {/* Saved Indicator */}
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-white/40 border-l border-white/10 pl-2">
                <Check className="h-3 w-3 text-emerald-400" />
                <span>Saved</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Tools, Design, Run & Publish */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Widget Script Button */}
            <button
              onClick={() => setShowWidgetScriptModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#0f121a]/90 backdrop-blur-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/90 shadow-xl transition hover:bg-white/10 hover:border-white/20 active:scale-95"
            >
              <Code className="h-3.5 w-3.5 text-blue-400" />
              <span>Widget Script</span>
            </button>

            {/* Design Chat Button */}
            <button
              onClick={() => setShowDesignPanel((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xl transition active:scale-95 border ${
                showDesignPanel
                  ? "bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "bg-[#0f121a]/90 backdrop-blur-xl text-purple-300 border-white/10 hover:bg-purple-950/30 hover:border-purple-500/30"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>Design Chat</span>
            </button>

            {/* Run Button */}
            <button
              onClick={() => setShowRunModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.35)] transition hover:from-blue-500 hover:to-indigo-500 active:scale-95 border border-blue-400/30"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Run</span>
            </button>

            {/* Publish Split Button */}
            <div className="flex overflow-hidden rounded-xl border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.3)] bg-gradient-to-r from-rose-600 to-red-600">
              <button
                onClick={async () => {
                  if (!activeWorkflowId || isPublishing) return
                  setIsPublishing(true)
                  const success = await publishWorkflow(activeWorkflowId)
                  setIsPublishing(false)
                  if (success) {
                    setPublishSuccess(true)
                    setTimeout(() => setPublishSuccess(false), 2000)
                  }
                }}
                disabled={isPublishing}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-75"
              >
                {isPublishing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : publishSuccess ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                <span>{publishSuccess ? "Published!" : "Publish"}</span>
              </button>
            </div>

            {/* Profile Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-xl ring-2 ring-white/10">
              M
            </div>
          </div>
        </div>

        {/* ── Node Library Shelf ─────────────────────────────────────────── */}
        <div className="absolute left-4 top-1/2 z-30 -translate-y-1/2">
          <NodeLibrary />
        </div>

        {/* ── Bottom Utility Controls Dock ─────────────────────────────────── */}
        <div className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-2xl bg-[#0f121a]/90 backdrop-blur-xl border border-white/10 px-3 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            {/* Pan mode indicator */}
            <button
              title="Pan Canvas (Hold Left Click or Space)"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                isPanningState
                  ? "bg-blue-600 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Move className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Zoom Out */}
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition active:scale-95"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            {/* Zoom Percentage (Click to reset to 100%) */}
            <button
              onClick={handleResetZoom}
              title="Reset Zoom to 100%"
              className="px-2 py-1 text-xs font-mono font-semibold text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition"
            >
              {Math.round(zoom * 100)}%
            </button>

            {/* Zoom In */}
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition active:scale-95"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Fit View */}
            <button
              onClick={handleFitView}
              title="Fit to Screen / Center"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition active:scale-95"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Grid Toggle */}
            <button
              onClick={() =>
                setGridMode((prev) =>
                  prev === "dots" ? "cross" : prev === "cross" ? "clean" : "dots"
                )
              }
              title={`Grid mode: ${gridMode}`}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                gridMode !== "clean"
                  ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>

            {/* Minimap Toggle */}
            <button
              onClick={() => setShowMinimap((prev) => !prev)}
              title="Toggle Mini-map"
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                showMinimap
                  ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Map className="h-4 w-4" />
            </button>

            {/* Shortcuts Helper */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              title="Keyboard Shortcuts"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition active:scale-95"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Mini-map Overlay ─────────────────────────────────────────────── */}
        {showMinimap && (
          <div className="absolute bottom-20 right-6 z-30 w-48 h-32 rounded-2xl bg-[#0f121a]/95 backdrop-blur-xl border border-white/10 p-2.5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Mini-map
              </span>
              <button
                onClick={() => setShowMinimap(false)}
                className="text-white/30 hover:text-white transition"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="relative flex-1 bg-black/40 rounded-lg mt-1 overflow-hidden border border-white/5">
              {/* Thumbnail of nodes */}
              <div
                className="absolute inset-0"
                style={{
                  transform: "scale(0.08)",
                  transformOrigin: "top left",
                }}
              >
                {/* Start node */}
                <div
                  className="absolute w-28 h-10 rounded-full bg-emerald-500"
                  style={{ left: startNodePos.x, top: startNodePos.y }}
                />
                {/* Flow nodes */}
                {nodes.map((n) => (
                  <div
                    key={n.id}
                    className="absolute w-64 h-32 rounded-xl bg-blue-500/80 border-2 border-white"
                    style={{ left: n.position.x, top: n.position.y }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Settings Panels ──────────────────────────────────────────────── */}
        {(() => {
          const activeNode = nodes.find((n) => n.id === activeNodeId)
          if (activeNode?.type === "message") {
            return (
              <MessageSettingsPanel
                variants={activeNode.variants}
                waitForInput={activeNode.waitForInput}
                saveEntireReply={activeNode.saveEntireReply ?? false}
                captureVariable={activeNode.captureVariable}
                buttons={activeNode.buttons ?? []}
                onChangeVariants={(variants) => handleNodeUpdate({ ...activeNode, variants })}
                onChangeWait={(waitForInput) => handleNodeUpdate({ ...activeNode, waitForInput })}
                onChangeSaveReply={(saveEntireReply) =>
                  handleNodeUpdate({ ...activeNode, saveEntireReply })
                }
                onChangeCaptureVariable={(captureVariable) =>
                  handleNodeUpdate({ ...activeNode, captureVariable })
                }
                onChangeButtons={(buttons: NodeButton[]) => {
                  handleNodeUpdate({ ...activeNode, buttons })
                  const buttonIds = new Set(buttons.map((b) => b.id))
                  setEdges((prev) =>
                    prev.filter(
                      (e) =>
                        e.from !== activeNode.id ||
                        !e.sourceHandleId ||
                        buttonIds.has(e.sourceHandleId)
                    )
                  )
                }}
                onDelete={() => {
                  setNodes((prev) => prev.filter((n) => n.id !== activeNode.id))
                  setEdges((prev) =>
                    prev.filter((e) => e.from !== activeNode.id && e.to !== activeNode.id)
                  )
                  setActiveNodeId(null)
                }}
              />
            )
          } else if (activeNode?.type === "carousel") {
            const carouselNode = activeNode as CarouselNodeData
            return (
              <CarouselSettingsPanel
                cards={carouselNode.cards}
                onChangeCards={(cards) => {
                  handleNodeUpdate({ ...carouselNode, cards })
                  const allButtonIds = new Set(cards.flatMap((c) => c.buttons?.map((b) => b.id) || []))
                  setEdges((prev) =>
                    prev.filter(
                      (e) =>
                        e.from !== carouselNode.id ||
                        !e.sourceHandleId ||
                        allButtonIds.has(e.sourceHandleId)
                    )
                  )
                }}
                onDelete={() => {
                  setNodes((prev) => prev.filter((n) => n.id !== carouselNode.id))
                  setEdges((prev) =>
                    prev.filter((e) => e.from !== carouselNode.id && e.to !== carouselNode.id)
                  )
                  setActiveNodeId(null)
                  setCarouselOffsets((prev) => {
                    const next = { ...prev }
                    delete next[carouselNode.id]
                    return next
                  })
                }}
              />
            )
          } else if (activeNode?.type === "api") {
            const apiNode = activeNode as ApiNodeData
            return (
              <ApiSettingsPanel
                data={apiNode}
                onEditTool={() => setEditingApiNodeId(apiNode.id)}
                onRunTool={() => setEditingApiNodeId(apiNode.id)}
                onChangeCaptureResponse={(captureResponse) =>
                  handleNodeUpdate({ ...apiNode, captureResponse })
                }
                onChangeAsyncExecution={(asyncExecution) =>
                  handleNodeUpdate({ ...apiNode, asyncExecution })
                }
                onChangeFailurePath={(failurePath) => {
                  handleNodeUpdate({ ...apiNode, failurePath })
                  if (!failurePath) {
                    setEdges((prev) =>
                      prev.filter((e) => e.from !== apiNode.id || e.sourceHandleId !== "fail")
                    )
                  }
                }}
                onDelete={() => {
                  setNodes((prev) => prev.filter((n) => n.id !== apiNode.id))
                  setEdges((prev) =>
                    prev.filter((e) => e.from !== apiNode.id && e.to !== apiNode.id)
                  )
                  setActiveNodeId(null)
                }}
              />
            )
          }
          return null
        })()}

        {/* ── API Config Modal ──────────────────────────────────────────────── */}
        {editingApiNodeId &&
          (() => {
            const apiNode = nodes.find((n) => n.id === editingApiNodeId) as ApiNodeData | undefined
            if (!apiNode) return null
            return (
              <ApiConfigModal
                data={apiNode}
                onChangeData={(data) => handleNodeUpdate(data)}
                onClose={() => setEditingApiNodeId(null)}
              />
            )
          })()}

        {/* ── Design Chat Panel ────────────────────────────────────────────── */}
        {showDesignPanel && <ChatDesignPanel onClose={() => setShowDesignPanel(false)} />}
      </div>

      {/* ── Run Modal ─────────────────────────────────────────────────────────── */}
      {showRunModal && (
        <RunModal
          nodes={nodes as MessageNodeData[]}
          edges={edges}
          agentsMap={allAgents}
          onClose={() => setShowRunModal(false)}
        />
      )}

      {/* ── Agent Studio ─────────────────────────────────────────────────────── */}
      <AgentStudio
        apiNodes={
          nodes
            .filter((n) => n.type === "api")
            .map((n) => ({ id: n.id, ...(n as any).data })) as ApiNodeData[]
        }
      />

      {/* ── Widget Script Modal ──────────────────────────────────────────────── */}
      {showWidgetScriptModal &&
        (() => {
          const host =
            typeof window !== "undefined" ? window.location.origin : "https://ai-chatbot-ixph.vercel.app"
          const wfId = activeWorkflowId || "default"
          const scriptCode = `<script src="${host}/widget-loader.js"></script>\n<script>\n  window.addEventListener('load', function() {\n    if (window.initAIChatbot) {\n      window.initAIChatbot({\n        host: "${host}",\n        projectId: "${wfId}"\n      });\n    }\n  });\n</script>`

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
              <div className="w-[560px] rounded-2xl bg-[#0f121a] border border-white/10 shadow-2xl overflow-hidden flex flex-col text-white">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-blue-400" />
                    <h2 className="text-base font-bold text-white">Embed Widget Script</h2>
                  </div>
                  <button
                    onClick={() => setShowWidgetScriptModal(false)}
                    className="text-white/40 hover:text-white transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  {/* Status Banner */}
                  {isPublished ? (
                    <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-300">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>
                        <strong>Published & Ready:</strong> Widget will execute the latest published
                        snapshot.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-300">
                      <span>⚠️</span>
                      <div>
                        <strong className="block font-semibold">Workflow is in Draft mode</strong>
                        <span>
                          Click &quot;Publish Now&quot; to push your updates live before embedding.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <pre className="bg-black/50 p-4 rounded-xl border border-white/10 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap">
                      {scriptCode}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(scriptCode)
                        alert("Script code copied to clipboard!")
                      }}
                      className="absolute top-3 right-3 rounded-lg bg-white/10 border border-white/10 p-1.5 hover:bg-white/20 text-white/80 transition"
                      title="Copy script"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-t border-white/10">
                  <button
                    onClick={async () => {
                      if (!activeWorkflowId || isPublishing) return
                      setIsPublishing(true)
                      const success = await publishWorkflow(activeWorkflowId)
                      setIsPublishing(false)
                      if (success) {
                        setPublishSuccess(true)
                        setTimeout(() => setPublishSuccess(false), 2000)
                      }
                    }}
                    disabled={isPublishing || isPublished === true}
                    className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    <span>{isPublishing ? "Publishing..." : isPublished ? "Published" : "Publish Now"}</span>
                  </button>

                  <button
                    onClick={() => setShowWidgetScriptModal(false)}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

      {/* ── Shortcuts Helper Modal ───────────────────────────────────────────── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-[420px] rounded-2xl bg-[#0f121a] border border-white/10 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Canvas Flow Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-white/40 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Pan Canvas</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
                  Left Click + Drag
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Zoom In / Out</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
                  Ctrl + Wheel or Pinch
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Add Connected Action</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
                  Click Port Handle
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-white/60">Manual Connection</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
                  Drag from Port to Port
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-white/60">Delete Node / Edge</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white/90">
                  Click Red X
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Animation styles */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-50%) translateX(-6px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0);    }
        }
      `}</style>
    </div>
  )
}

export default function CanvasFlowPage() {
  return (
    <ChatThemeProvider>
      <AgentStoreProvider>
        <CanvasFlowPageInner />
      </AgentStoreProvider>
    </ChatThemeProvider>
  )
}

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
    <div className="w-64 rounded-2xl bg-[#0f121a]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-bold text-white">Pick a Playbook</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white transition">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ul className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
        {playbooks.length === 0 && (
          <li className="px-4 py-3 text-xs text-white/30 italic">No playbooks yet.</li>
        )}
        {playbooks.map((pb) => (
          <li key={pb.id}>
            <button
              onClick={() => onPick(pb.id)}
              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left rounded-xl hover:bg-violet-600/15 transition"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-3 w-3 shrink-0 text-violet-400" />
                <span className="truncate text-xs font-semibold text-white/90">{pb.title}</span>
                <span
                  className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                    pb.status === "published"
                      ? "bg-emerald-900/40 text-emerald-400"
                      : "bg-amber-900/30 text-amber-400"
                  }`}
                >
                  {pb.status}
                </span>
              </div>
              {pb.trigger && <p className="truncate pl-5 text-[10px] text-white/30">{pb.trigger}</p>}
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-white/8 p-2">
        <button
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-violet-500/30 py-2 text-xs font-medium text-violet-400 transition hover:border-violet-500/60 hover:bg-violet-500/10"
        >
          <Plus className="h-3 w-3" />
          Create new playbook
        </button>
      </div>
    </div>
  )
}

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
    <div className="w-64 rounded-2xl bg-[#0f121a]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-bold text-white">Pick an Agent</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white transition">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ul className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
        {agents.length === 0 && (
          <li className="px-4 py-3 text-xs text-white/30 italic text-center">
            No agents in workspace yet.
          </li>
        )}
        {agents.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => onPick(a.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left rounded-xl hover:bg-blue-600/15 transition"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <span className="flex-1 truncate text-xs font-semibold text-white/90">{a.title}</span>
              <span
                className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                  a.status === "published"
                    ? "bg-emerald-900/40 text-emerald-400"
                    : "bg-amber-900/30 text-amber-400"
                }`}
              >
                {a.status}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-white/8 p-2">
        <button
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-500/30 py-2 text-xs font-medium text-blue-400 transition hover:border-blue-500/60 hover:bg-blue-500/10"
        >
          <Plus className="h-3 w-3" />
          Create new agent
        </button>
      </div>
    </div>
  )
}
