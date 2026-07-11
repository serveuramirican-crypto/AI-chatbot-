"use client"

import React from "react"
import { Play, Plus } from "lucide-react"
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
 * Start Node — green pill with Play icon, label, and a permanent ConnectorHandle port.
 * The port triggers both click-to-connect and drag-to-connect.
 */
export default function StartNode({ onPortMouseDown, onPortClick, connected }: StartNodeProps) {
  return (
    <div className="relative flex items-center select-none">
      {/* ── Pill body ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 rounded-full bg-[#1a7a47] px-4 py-2 shadow-lg">
        {/* Play icon */}
        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-white/20">
          <Play className="h-3 w-3 fill-white text-white" />
        </div>

        <span className="text-sm font-semibold text-white">Start</span>

        {/* Legacy inner port button — kept for drag affordance inside pill */}
        <button
          onMouseDown={onPortMouseDown}
          onClick={onPortClick}
          title="Drag to connect"
          className={`
            flex h-5 w-5 items-center justify-center rounded-full
            border-2 transition-all duration-200
            ${connected
              ? "scale-110 border-white bg-white/40"
              : "border-white/50 bg-white/20 hover:scale-125 hover:border-white hover:bg-white/40"
            }
          `}
          style={{ cursor: "crosshair" }}
        >
          <Plus className="h-3 w-3 text-white" />
        </button>
      </div>

      {/* ── Permanent ConnectorHandle on the right edge ─────────────────── */}
      <ConnectorHandle
        connected={connected}
        onMouseDown={onPortMouseDown}
        onClick={onPortClick}
      />
    </div>
  )
}
