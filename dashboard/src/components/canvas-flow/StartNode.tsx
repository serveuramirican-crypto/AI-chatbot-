"use client"

import React from "react"
import { Play, Plus, Sparkles } from "lucide-react"
import ConnectorHandle from "./ConnectorHandle"

interface StartNodeProps {
  /** MouseDown handler — starts the drag from parent */
  onPortMouseDown: (e: React.MouseEvent) => void
  /** Click handler — opens ActionsDropdown without dragging */
  onPortClick: (e: React.MouseEvent) => void
  /** Whether a connection line is currently attached */
  connected: boolean
}

/**
 * Start Node — modern flow entry capsule with emerald gradient,
 * glowing pulse beacon, and precision connector handles.
 */
export default function StartNode({ onPortMouseDown, onPortClick, connected }: StartNodeProps) {
  return (
    <div className="relative flex items-center select-none group">
      {/* ── Outer glowing aura on hover ─────────────────────────────────── */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 blur-md group-hover:opacity-40 transition-opacity" />

      {/* ── Pill body ──────────────────────────────────────────────────────── */}
      <div className="relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-4 py-2 shadow-[0_8px_20px_-4px_rgba(16,185,129,0.45)] border border-emerald-300/40 backdrop-blur-sm transition-all duration-200 group-hover:shadow-[0_12px_28px_-4px_rgba(16,185,129,0.6)] group-hover:scale-[1.02]">
        
        {/* Play icon inside frosted badge */}
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 border border-white/30 shadow-inner">
          <Play className="h-3 w-3 fill-white text-white ml-0.5" />
        </div>

        <div className="flex flex-col pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-white">Start</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
            </span>
          </div>
          <span className="text-[9px] font-semibold tracking-wider uppercase text-emerald-100/90 -mt-0.5">Flow Entry</span>
        </div>

        {/* Inner quick-connect affordance button */}
        <button
          onMouseDown={onPortMouseDown}
          onClick={onPortClick}
          title="Drag or click to connect next action"
          className={`
            flex h-6 w-6 items-center justify-center rounded-full
            border border-white/40 transition-all duration-200
            ${
              connected
                ? "bg-white/30 text-white scale-105"
                : "bg-white/15 text-white/90 hover:scale-115 hover:bg-white/35 hover:border-white shadow-sm"
            }
          `}
          style={{ cursor: "crosshair" }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── ConnectorHandle port on right edge ─────────────────────────── */}
      <ConnectorHandle
        connected={connected}
        onMouseDown={onPortMouseDown}
        onClick={onPortClick}
        color="emerald"
      />
    </div>
  )
}
