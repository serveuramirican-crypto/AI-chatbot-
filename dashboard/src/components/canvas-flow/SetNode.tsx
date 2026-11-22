"use client"

import React from "react"
import { Sliders, Sparkles, Variable, ArrowRight } from "lucide-react"
import ConnectorHandle from "./ConnectorHandle"
import type { SetNodeData } from "@/types/setNode"

export const SET_NODE_WIDTH = 268
export const SET_NODE_HEADER_H = 38
export const SET_NODE_BODY_H = 68

interface SetNodeProps {
  data: SetNodeData
  isActive: boolean
  onClick: (e: React.MouseEvent) => void
  onPortMouseDown?: (e: React.MouseEvent, handleId?: string) => void
  onPortClick?: (e: React.MouseEvent, handleId?: string) => void
  connected?: boolean
  hasIncoming?: boolean
}

export default function SetNode({
  data,
  isActive,
  onClick,
  onPortMouseDown,
  onPortClick,
  connected = false,
  hasIncoming = false,
}: SetNodeProps) {
  const assignmentsCount = data.config?.assignments?.length ?? 0
  const propertiesCount = data.config?.transcriptProperties?.length ?? 0
  const totalCount = assignmentsCount + propertiesCount

  // Generate summary text
  let summaryText = "No assignments configured"
  if (assignmentsCount > 0 && propertiesCount > 0) {
    summaryText = `${assignmentsCount} variable${assignmentsCount > 1 ? "s" : ""} · ${propertiesCount} propert${propertiesCount > 1 ? "ies" : "y"}`
  } else if (assignmentsCount > 0) {
    summaryText = `${assignmentsCount} assignment${assignmentsCount > 1 ? "s" : ""}`
  } else if (propertiesCount > 0) {
    summaryText = `${propertiesCount} propert${propertiesCount > 1 ? "ies" : "y"}`
  }

  // Summary preview pills (first 2 assignments)
  const previewItems = [
    ...(data.config?.assignments || []).map((a) => ({
      label: a.label || "var",
      type: a.type === "prompt" ? "AI" : "Val",
      isPrompt: a.type === "prompt",
    })),
    ...(data.config?.transcriptProperties || []).map((p) => ({
      label: p.label || "prop",
      type: p.operationType === "append" ? "+=" : "=",
      isPrompt: false,
    })),
  ].slice(0, 2)

  return (
    <div className="relative flex items-start select-none group">
      {/* ── Incoming Connection Socket (Left) ── */}
      <ConnectorHandle
        isTarget={true}
        connected={hasIncoming}
        onClick={onPortClick ?? ((e) => e.preventDefault())}
        onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
        color="amber"
      />

      {/* ── Main Node Body ── */}
      <div
        onClick={onClick}
        style={{ width: SET_NODE_WIDTH }}
        className={`
          rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)]
          border transition-all duration-200 cursor-pointer overflow-hidden
          hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.15)]
          ${isActive ? 'border-amber-500 ring-4 ring-amber-500/20 shadow-[0_0_25px_rgba(245,158,11,0.25)]' : 'border-slate-200/90 hover:border-slate-300'}
        `}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-50/60 via-amber-50/30 to-white px-3.5"
          style={{ height: SET_NODE_HEADER_H }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 shadow-xs">
              <Sliders className="h-3 w-3" />
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-tight">Set</span>
          </div>

          <div className="flex items-center gap-1.5">
            {data.config?.parallelExecution && (
              <span className="text-[9px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200">
                Parallel
              </span>
            )}
            <span className="text-[10px] font-medium text-slate-400">
              {totalCount > 0 ? `${totalCount} item${totalCount > 1 ? "s" : ""}` : "Empty"}
            </span>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-3" style={{ minHeight: SET_NODE_BODY_H }}>
          <div className="w-full rounded-xl bg-slate-50/90 border border-slate-100/90 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {totalCount > 0 ? summaryText : "Set variable values"}
              </p>
            </div>

            {/* Assignment preview pills */}
            {previewItems.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {previewItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 font-mono shadow-xs truncate max-w-[120px]"
                  >
                    <span className="font-semibold text-slate-700 truncate">{item.label}</span>
                    <span className="text-[8px] text-amber-600 bg-amber-50 px-1 rounded font-bold shrink-0">
                      {item.type}
                    </span>
                  </div>
                ))}
                {totalCount > 2 && (
                  <span className="text-[9px] text-slate-400 font-medium self-center">
                    +{totalCount - 2} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 leading-tight">
                Assign or update workflow variables & properties
              </p>
            )}
          </div>
        </div>

        {/* Outgoing Next label pill next to handle */}
        <div className="px-3 pb-2 flex justify-end items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next</span>
          <ArrowRight className="h-2.5 w-2.5 text-slate-300" />
        </div>
      </div>

      {/* ── Outgoing 'Next' Port (Right) ── */}
      <ConnectorHandle
        connected={connected}
        onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
        onClick={onPortClick ?? ((e) => e.preventDefault())}
        handleId="next"
        color="amber"
      />
    </div>
  )
}
