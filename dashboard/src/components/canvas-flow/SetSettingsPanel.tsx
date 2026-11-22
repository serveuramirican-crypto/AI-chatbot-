"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import {
  Sliders,
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Check,
  X,
  Variable,
  Layers,
  FileText,
  Search,
  ExternalLink,
  Info,
} from "lucide-react"
import type {
  SetNodeData,
  VariableAssignment,
  TranscriptPropertyAssignment,
  WorkflowVariable,
  PromptResource,
  TranscriptProperty,
  AssignmentType,
  TranscriptOperationType,
} from "@/types/setNode"
import {
  fetchWorkflowVariables,
  createWorkflowVariable,
  fetchPrompts,
  createPrompt,
  fetchTranscriptProperties,
  createTranscriptProperty,
  extractVariableReferences,
} from "@/lib/setStore"

interface SetSettingsPanelProps {
  data: SetNodeData
  workflowId?: string
  onChange: (updatedData: SetNodeData) => void
  onDelete?: () => void
}

export default function SetSettingsPanel({
  data,
  workflowId,
  onChange,
  onDelete,
}: SetSettingsPanelProps) {
  // ── Database collections state ──────────────────────────────────────────────
  const [variablesList, setVariablesList] = useState<WorkflowVariable[]>([])
  const [promptsList, setPromptsList] = useState<PromptResource[]>([])
  const [propertiesList, setPropertiesList] = useState<TranscriptProperty[]>([])
  const [loadingResources, setLoadingResources] = useState(true)

  // ── Modals / In-line creation state ─────────────────────────────────────────
  const [showNewVarModal, setShowNewVarModal] = useState(false)
  const [newVarName, setNewVarName] = useState("")
  const [newVarType, setNewVarType] = useState<"string" | "number" | "boolean">("string")
  const [newVarDesc, setNewVarDesc] = useState("")
  const [creatingVarTargetRowId, setCreatingVarTargetRowId] = useState<string | null>(null)

  const [showNewPromptModal, setShowNewPromptModal] = useState(false)
  const [newPromptName, setNewPromptName] = useState("")
  const [newPromptContent, setNewPromptContent] = useState("")
  const [newPromptDesc, setNewPromptDesc] = useState("")
  const [creatingPromptTargetRowId, setCreatingPromptTargetRowId] = useState<string | null>(null)

  const [showNewPropModal, setShowNewPropModal] = useState(false)
  const [newPropName, setNewPropName] = useState("")
  const [newPropType, setNewPropType] = useState<"string" | "number" | "boolean">("string")
  const [newPropDesc, setNewPropDesc] = useState("")
  const [creatingPropTargetRowId, setCreatingPropTargetRowId] = useState<string | null>(null)

  // ── Autocomplete popover state ──────────────────────────────────────────────
  const [autocompleteTarget, setAutocompleteTarget] = useState<{
    id: string
    isProperty: boolean
  } | null>(null)

  // ── Load Supabase data on mount ─────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      setLoadingResources(true)
      const [vars, prompts, props] = await Promise.all([
        fetchWorkflowVariables(workflowId),
        fetchPrompts(),
        fetchTranscriptProperties(),
      ])
      if (isMounted) {
        setVariablesList(vars)
        setPromptsList(prompts)
        setPropertiesList(props)
        setLoadingResources(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [workflowId])

  // ── Helper to update node config safely ─────────────────────────────────────
  const updateConfig = (patch: Partial<SetNodeData["config"]>) => {
    onChange({
      ...data,
      config: {
        assignments: data.config?.assignments ?? [],
        transcriptProperties: data.config?.transcriptProperties ?? [],
        parallelExecution: data.config?.parallelExecution ?? false,
        ...patch,
      },
    })
  }

  // Known variable names set for validation
  const variableNamesSet = useMemo(() => {
    return new Set(variablesList.map((v) => v.name))
  }, [variablesList])

  // ── SECTION A: VARIABLES ASSIGNMENTS ────────────────────────────────────────

  const handleAddVariable = () => {
    const newId = `assign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const firstVar = variablesList[0]
    const newAssignment: VariableAssignment = {
      id: newId,
      type: "value",
      variableID: firstVar ? firstVar.id : "",
      label: firstVar ? firstVar.name : "Select Variable",
      value: "",
    }
    updateConfig({
      assignments: [...(data.config?.assignments || []), newAssignment],
    })
  }

  const handleUpdateAssignment = (id: string, patch: Partial<VariableAssignment>) => {
    const updated = (data.config?.assignments || []).map((item) => {
      if (item.id !== id) return item
      return { ...item, ...patch }
    })
    updateConfig({ assignments: updated })
  }

  const handleDeleteAssignment = (id: string) => {
    const filtered = (data.config?.assignments || []).filter((item) => item.id !== id)
    updateConfig({ assignments: filtered })
  }

  const handleMoveAssignment = (index: number, direction: "up" | "down") => {
    const items = [...(data.config?.assignments || [])]
    const targetIdx = direction === "up" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= items.length) return
    const temp = items[index]
    items[index] = items[targetIdx]
    items[targetIdx] = temp
    updateConfig({ assignments: items })
  }

  // ── SECTION B: PROPERTIES ASSIGNMENTS ───────────────────────────────────────

  const handleAddProperty = () => {
    const newId = `prop_assign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const firstProp = propertiesList[0]
    const newPropAssignment: TranscriptPropertyAssignment = {
      id: newId,
      propertyID: firstProp ? firstProp.id : "",
      label: firstProp ? firstProp.name : "Select Property",
      operationType: "replace",
      value: "",
    }
    updateConfig({
      transcriptProperties: [...(data.config?.transcriptProperties || []), newPropAssignment],
    })
  }

  const handleUpdateProperty = (id: string, patch: Partial<TranscriptPropertyAssignment>) => {
    const updated = (data.config?.transcriptProperties || []).map((item) => {
      if (item.id !== id) return item
      return { ...item, ...patch }
    })
    updateConfig({ transcriptProperties: updated })
  }

  const handleDeleteProperty = (id: string) => {
    const filtered = (data.config?.transcriptProperties || []).filter((item) => item.id !== id)
    updateConfig({ transcriptProperties: filtered })
  }

  const handleMoveProperty = (index: number, direction: "up" | "down") => {
    const items = [...(data.config?.transcriptProperties || [])]
    const targetIdx = direction === "up" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= items.length) return
    const temp = items[index]
    items[index] = items[targetIdx]
    items[targetIdx] = temp
    updateConfig({ transcriptProperties: items })
  }

  // ── Creation Handlers ───────────────────────────────────────────────────────

  const handleCreateVariableSubmit = async () => {
    if (!newVarName.trim()) return
    const created = await createWorkflowVariable(
      newVarName.trim(),
      newVarType,
      newVarDesc.trim(),
      "",
      workflowId
    )
    if (created) {
      setVariablesList((prev) => [...prev, created])
      if (creatingVarTargetRowId) {
        handleUpdateAssignment(creatingVarTargetRowId, {
          variableID: created.id,
          label: created.name,
        })
      }
    }
    setNewVarName("")
    setNewVarDesc("")
    setShowNewVarModal(false)
    setCreatingVarTargetRowId(null)
  }

  const handleCreatePromptSubmit = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) return
    const created = await createPrompt(newPromptName.trim(), newPromptContent.trim(), newPromptDesc.trim())
    if (created) {
      setPromptsList((prev) => [...prev, created])
      if (creatingPromptTargetRowId) {
        handleUpdateAssignment(creatingPromptTargetRowId, {
          promptID: created.id,
        })
      }
    }
    setNewPromptName("")
    setNewPromptContent("")
    setNewPromptDesc("")
    setShowNewPromptModal(false)
    setCreatingPromptTargetRowId(null)
  }

  const handleCreatePropertySubmit = async () => {
    if (!newPropName.trim()) return
    const created = await createTranscriptProperty(newPropName.trim(), newPropType, newPropDesc.trim())
    if (created) {
      setPropertiesList((prev) => [...prev, created])
      if (creatingPropTargetRowId) {
        handleUpdateProperty(creatingPropTargetRowId, {
          propertyID: created.id,
          label: created.name,
        })
      }
    }
    setNewPropName("")
    setNewPropDesc("")
    setShowNewPropModal(false)
    setCreatingPropTargetRowId(null)
  }

  // ── Validation: Duplicate target variables in parallel execution ────────────
  const parallelDuplicates = useMemo(() => {
    if (!data.config?.parallelExecution) return []
    const targets = (data.config?.assignments || []).map((a) => a.label).filter(Boolean)
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const t of targets) {
      if (seen.has(t)) duplicates.add(t)
      seen.add(t)
    }
    return Array.from(duplicates)
  }, [data.config?.parallelExecution, data.config?.assignments])

  return (
    <div
      className="absolute right-4 top-4 bottom-4 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col z-50 overflow-hidden select-none"
      onClick={(e) => {
        e.stopPropagation()
        setAutocompleteTarget(null)
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 via-white to-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 shadow-xs">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">Set</h2>
            <p className="text-[11px] text-slate-400">Set variable values</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors"
              title="Delete Set Node"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Scrollable Body ────────────────────────────────────────────── */}
      <div className="p-4 flex-1 overflow-y-auto space-y-6 text-xs text-slate-700">
        {/* ── SECTION A: VARIABLES TO SET ──────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Variable className="h-3.5 w-3.5 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Variables to set
              </h3>
            </div>
            <button
              onClick={handleAddVariable}
              className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded-md transition"
            >
              <Plus className="h-3 w-3" />
              <span>Add variable</span>
            </button>
          </div>

          {/* Assignments List */}
          {(!data.config?.assignments || data.config.assignments.length === 0) ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <p className="text-[11px] text-slate-400 mb-2">No variables configured yet.</p>
              <button
                onClick={handleAddVariable}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-white border border-amber-200 shadow-xs rounded-lg px-2.5 py-1.5 transition"
              >
                <Plus className="h-3 w-3" />
                <span>Add variable</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.config.assignments.map((assignment, index) => {
                // Check unresolved variable references inside value
                const unresRefs = extractVariableReferences(assignment.value || "").filter(
                  (ref) => !variableNamesSet.has(ref)
                )

                return (
                  <div
                    key={assignment.id}
                    className="group/item relative rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-amber-300 transition-all p-3 space-y-2.5 shadow-xs"
                  >
                    {/* Row Header: Variable Selector + Type Switcher + Reorder/Delete */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Variable Selector */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={assignment.variableID || ""}
                          onChange={(e) => {
                            if (e.target.value === "__create_new__") {
                              setCreatingVarTargetRowId(assignment.id)
                              setShowNewVarModal(true)
                            } else {
                              const found = variablesList.find((v) => v.id === e.target.value)
                              handleUpdateAssignment(assignment.id, {
                                variableID: e.target.value,
                                label: found?.name || e.target.value,
                              })
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        >
                          <option value="" disabled>
                            Select variable...
                          </option>
                          {variablesList.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.type})
                            </option>
                          ))}
                          <option value="__create_new__" className="text-amber-600 font-bold">
                            + Create new variable...
                          </option>
                        </select>
                      </div>

                      {/* Type Toggle: Value vs Prompt */}
                      <div className="flex rounded-lg bg-slate-200/80 p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateAssignment(assignment.id, { type: "value" })}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                            assignment.type === "value"
                              ? "bg-white text-slate-800 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Value
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateAssignment(assignment.id, {
                              type: "prompt",
                              promptID: assignment.promptID || promptsList[0]?.id || "",
                            })
                          }
                          className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md transition ${
                            assignment.type === "prompt"
                              ? "bg-white text-amber-700 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                          <span>Prompt</span>
                        </button>
                      </div>

                      {/* Reorder and Delete Controls */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveAssignment(index, "up")}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                          title="Move Up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === (data.config.assignments.length - 1)}
                          onClick={() => handleMoveAssignment(index, "down")}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                          title="Move Down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete assignment"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Value Input */}
                    {assignment.type === "value" && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder='e.g. Ahmed, 250, or "Hello {customer_name}"'
                          value={assignment.value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                            handleUpdateAssignment(assignment.id, { value: val })
                            if (val.endsWith("{")) {
                              setAutocompleteTarget({ id: assignment.id, isProperty: false })
                            } else {
                              setAutocompleteTarget(null)
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        />

                        {/* Autocomplete Menu */}
                        {autocompleteTarget?.id === assignment.id && !autocompleteTarget.isProperty && (
                          <div
                            className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-1 max-h-44 overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Insert Variable Reference
                            </div>
                            {variablesList.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  const currentVal = assignment.value || ""
                                  const newVal = currentVal.replace(/\{$/, `{${v.name}}`)
                                  handleUpdateAssignment(assignment.id, { value: newVal })
                                  setAutocompleteTarget(null)
                                }}
                                className="w-full text-left px-2 py-1 rounded-lg hover:bg-amber-50 flex items-center justify-between text-xs text-slate-700"
                              >
                                <span className="font-semibold">{v.name}</span>
                                <span className="text-[10px] text-slate-400">{v.type}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Unresolved reference warning */}
                        {unresRefs.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/80">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>
                              Unresolved variable reference: {unresRefs.map((r) => `{${r}}`).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode 2: Prompt Selector */}
                    {assignment.type === "prompt" && (
                      <div className="space-y-1.5 bg-amber-50/40 border border-amber-200/60 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">
                            Select Reusable Prompt
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatingPromptTargetRowId(assignment.id)
                              setShowNewPromptModal(true)
                            }}
                            className="text-[10px] font-bold text-amber-700 hover:underline"
                          >
                            + New Prompt
                          </button>
                        </div>
                        <select
                          value={assignment.promptID || ""}
                          onChange={(e) => {
                            if (e.target.value === "__create_prompt__") {
                              setCreatingPromptTargetRowId(assignment.id)
                              setShowNewPromptModal(true)
                            } else {
                              handleUpdateAssignment(assignment.id, { promptID: e.target.value })
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                        >
                          <option value="" disabled>
                            Choose an AI Prompt...
                          </option>
                          {promptsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                          <option value="__create_prompt__" className="text-amber-600 font-bold">
                            + Create new prompt...
                          </option>
                        </select>

                        {/* Prompt Description Preview */}
                        {assignment.promptID && (
                          <div className="text-[10px] text-slate-500 line-clamp-2 px-1">
                            {promptsList.find((p) => p.id === assignment.promptID)?.description ||
                              promptsList.find((p) => p.id === assignment.promptID)?.content.slice(0, 100)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── SECTION B: PROPERTIES TO SET ─────────────────────────────────── */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Properties to set
              </h3>
            </div>
            <button
              onClick={handleAddProperty}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-md transition"
            >
              <Plus className="h-3 w-3" />
              <span>Add property</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-tight">
            Attach metadata to this conversation transcript for reporting and filtering.
          </p>

          {/* Properties List */}
          {(!data.config?.transcriptProperties || data.config.transcriptProperties.length === 0) ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <p className="text-[11px] text-slate-400 mb-2">No properties configured yet.</p>
              <button
                onClick={handleAddProperty}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-blue-200 shadow-xs rounded-lg px-2.5 py-1.5 transition"
              >
                <Plus className="h-3 w-3" />
                <span>Add property</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.config.transcriptProperties.map((prop, index) => (
                <div
                  key={prop.id}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all p-3 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Property Selector */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={prop.propertyID || ""}
                        onChange={(e) => {
                          if (e.target.value === "__create_prop__") {
                            setCreatingPropTargetRowId(prop.id)
                            setShowNewPropModal(true)
                          } else {
                            const found = propertiesList.find((p) => p.id === e.target.value)
                            handleUpdateProperty(prop.id, {
                              propertyID: e.target.value,
                              label: found?.name || e.target.value,
                            })
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      >
                        <option value="" disabled>
                          Select property...
                        </option>
                        {propertiesList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                        <option value="__create_prop__" className="text-blue-600 font-bold">
                          + Create new property...
                        </option>
                      </select>
                    </div>

                    {/* Operation Selector: Replace vs Append */}
                    <select
                      value={prop.operationType}
                      onChange={(e) =>
                        handleUpdateProperty(prop.id, {
                          operationType: e.target.value as TranscriptOperationType,
                        })
                      }
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 shadow-xs shrink-0"
                    >
                      <option value="replace">Replace</option>
                      <option value="append">Append</option>
                    </select>

                    {/* Controls */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveProperty(index, "up")}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === (data.config.transcriptProperties.length - 1)}
                        onClick={() => handleMoveProperty(index, "down")}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProperty(prop.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete property"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Value Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder='e.g. VIP, Returns, or "{customer_name}"'
                      value={prop.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value
                        handleUpdateProperty(prop.id, { value: val })
                        if (val.endsWith("{")) {
                          setAutocompleteTarget({ id: prop.id, isProperty: true })
                        } else {
                          setAutocompleteTarget(null)
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />

                    {/* Autocomplete Menu for Property */}
                    {autocompleteTarget?.id === prop.id && autocompleteTarget.isProperty && (
                      <div
                        className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-1 max-h-44 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Insert Variable Reference
                        </div>
                        {variablesList.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              const currentVal = prop.value || ""
                              const newVal = currentVal.replace(/\{$/, `{${v.name}}`)
                              handleUpdateProperty(prop.id, { value: newVal })
                              setAutocompleteTarget(null)
                            }}
                            className="w-full text-left px-2 py-1 rounded-lg hover:bg-blue-50 flex items-center justify-between text-xs text-slate-700"
                          >
                            <span className="font-semibold">{v.name}</span>
                            <span className="text-[10px] text-slate-400">{v.type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SECTION C: PARALLEL EXECUTION ─────────────────────────────────── */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700">Parallel execution</span>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                {data.config?.parallelExecution
                  ? "Execute variable assignments concurrently instead of sequentially."
                  : "Execute variable assignments one by one, in their configured order."}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={Boolean(data.config?.parallelExecution)}
                onChange={(e) => updateConfig({ parallelExecution: e.target.checked })}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>

          {/* Validation Warning for Conflicting Variables in Parallel mode */}
          {parallelDuplicates.length > 0 && (
            <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Conflicting parallel assignments:</p>
                <p className="text-[10px] leading-tight">
                  Multiple assignments target: {parallelDuplicates.map((d) => `"${d}"`).join(", ")}. In
                  parallel mode, concurrent writes to the same variable can produce unexpected results.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE VARIABLE MODAL ───────────────────────────────────────────── */}
      {showNewVarModal && (
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setShowNewVarModal(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800">Create Workflow Variable</h4>
              <button
                onClick={() => setShowNewVarModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Name</label>
                <input
                  type="text"
                  placeholder="e.g. customer_city"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Data Type</label>
                <select
                  value={newVarType}
                  onChange={(e) => setNewVarType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="string">String (Text)</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="What this variable is used for"
                  value={newVarDesc}
                  onChange={(e) => setNewVarDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowNewVarModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVariableSubmit}
                disabled={!newVarName.trim()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg shadow-xs"
              >
                Create Variable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE PROMPT MODAL ─────────────────────────────────────────────── */}
      {showNewPromptModal && (
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setShowNewPromptModal(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800">Create Reusable Prompt</h4>
              <button
                onClick={() => setShowNewPromptModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Prompt Name</label>
                <input
                  type="text"
                  placeholder="e.g. Extract Order Number"
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Instructions / Prompt Content</label>
                <textarea
                  rows={4}
                  placeholder="Extract order number or return concise answer..."
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowNewPromptModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePromptSubmit}
                disabled={!newPromptName.trim() || !newPromptContent.trim()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg shadow-xs"
              >
                Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE PROPERTY MODAL ───────────────────────────────────────────── */}
      {showNewPropModal && (
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setShowNewPropModal(false)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800">Create Transcript Property</h4>
              <button
                onClick={() => setShowNewPropModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Property Name</label>
                <input
                  type="text"
                  placeholder="e.g. satisfaction_level"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Data Type</label>
                <select
                  value={newPropType}
                  onChange={(e) => setNewPropType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="string">String (Text)</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowNewPropModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePropertySubmit}
                disabled={!newPropName.trim()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg shadow-xs"
              >
                Create Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
