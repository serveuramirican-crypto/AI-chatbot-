"use client"

import React from "react"

export interface ConnectorHandleProps {
  /** Whether a connection line is already attached from this port */
  connected?: boolean
  /** Click handler — opens the ActionsDropdown without dragging */
  onClick: (e: React.MouseEvent, handleId?: string) => void
  /** MouseDown handler — starts a free-drag connector line */
  onMouseDown: (e: React.MouseEvent, handleId?: string) => void
  /**
   * Optional port identifier — for button handles this is the button id,
   * for the main node port this is undefined (defaults to node body).
   */
  handleId?: string
  /**
   * Optional pixel offset from the top of the parent container.
   * When provided, overrides the default `top-1/2` centering so each
   * button handle can be positioned next to its own row.
   */
  topOffset?: number
  /** If true, renders on the left edge as a drop target (no mousedown dragging) */
  isTarget?: boolean
  /** Accent color variant */
  color?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'sky'
}

/**
 * ConnectorHandle — a permanent, high-precision circular connection socket rendered on
 * the edge of canvas nodes or next to individual button rows.
 */
export default function ConnectorHandle({
  connected = false,
  onClick,
  onMouseDown,
  handleId,
  topOffset,
  isTarget = false,
  color = 'blue',
}: ConnectorHandleProps) {
  const positionStyle: React.CSSProperties =
    topOffset !== undefined
      ? { top: topOffset, transform: "translateY(-50%)" }
      : {}

  const colorStyles = {
    blue: {
      connected: 'border-blue-500 bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]',
      idle: 'border-blue-400 bg-white hover:border-blue-600 hover:ring-4 hover:ring-blue-500/20 text-blue-500',
      dot: 'bg-blue-500',
    },
    sky: {
      connected: 'border-sky-500 bg-sky-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.6)]',
      idle: 'border-sky-400 bg-white hover:border-sky-600 hover:ring-4 hover:ring-sky-500/20 text-sky-500',
      dot: 'bg-sky-500',
    },
    emerald: {
      connected: 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]',
      idle: 'border-emerald-400 bg-white hover:border-emerald-600 hover:ring-4 hover:ring-emerald-500/20 text-emerald-500',
      dot: 'bg-emerald-500',
    },
    violet: {
      connected: 'border-violet-500 bg-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.6)]',
      idle: 'border-violet-400 bg-white hover:border-violet-600 hover:ring-4 hover:ring-violet-500/20 text-violet-500',
      dot: 'bg-violet-500',
    },
    amber: {
      connected: 'border-amber-500 bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)]',
      idle: 'border-amber-400 bg-white hover:border-amber-600 hover:ring-4 hover:ring-amber-500/20 text-amber-500',
      dot: 'bg-amber-500',
    },
    rose: {
      connected: 'border-rose-500 bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)]',
      idle: 'border-rose-400 bg-white hover:border-rose-600 hover:ring-4 hover:ring-rose-500/20 text-rose-500',
      dot: 'bg-rose-500',
    },
  }[color]

  return (
    <button
      title={isTarget ? "Connect to this node" : "Click to add action or drag to connect"}
      onClick={(e) => onClick(e, handleId)}
      onMouseDown={(e) => {
        if (!isTarget) {
          onMouseDown(e, handleId)
        } else {
          e.preventDefault()
        }
      }}
      style={{
        cursor: isTarget ? "default" : "crosshair",
        ...(isTarget ? { left: -10 } : { right: -10 }),
        ...positionStyle,
      }}
      className={`
        absolute group
        flex h-[22px] w-[22px] items-center justify-center
        rounded-full border-2 transition-all duration-200 z-30 select-none
        ${topOffset === undefined ? "top-1/2 -translate-y-1/2" : ""}
        ${
          connected
            ? `${colorStyles.connected} scale-105`
            : isTarget
            ? "border-slate-300 bg-white hover:border-blue-400 hover:ring-4 hover:ring-blue-400/20"
            : `${colorStyles.idle} shadow-md hover:scale-125`
        }
      `}
    >
      {/* Inner dot */}
      <span
        className={`
          block h-2 w-2 rounded-full transition-transform duration-200
          ${
            connected
              ? "bg-white scale-100"
              : isTarget
              ? "bg-slate-300 group-hover:bg-blue-400"
              : `${colorStyles.dot} group-hover:scale-125`
          }
        `}
      />
    </button>
  )
}
