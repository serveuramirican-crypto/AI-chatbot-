"use client"

import React from "react"

interface ConnectorHandleProps {
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
}

/**
 * ConnectorHandle — a permanent circular output port rendered on the right
 * edge of every canvas node (or next to each button row).
 *
 * Visual: outer ring (blue border) + small filled dot inside.
 * Interaction: click → open ActionsDropdown | mousedown → begin drag-to-connect.
 */
export default function ConnectorHandle({
  connected = false,
  onClick,
  onMouseDown,
  handleId,
  topOffset,
  isTarget = false,
}: ConnectorHandleProps) {
  const positionStyle: React.CSSProperties =
    topOffset !== undefined
      ? { top: topOffset, transform: "translateY(-50%)" }
      : {}

  return (
    <button
      title={isTarget ? "Drop connection here" : "Click or drag to connect"}
      onClick={(e) => onClick(e, handleId)}
      onMouseDown={(e) => {
        if (!isTarget) {
          onMouseDown(e, handleId)
        } else {
          e.preventDefault() // prevent pan
        }
      }}
      style={{
        cursor: isTarget ? "default" : "crosshair",
        ...(isTarget ? { left: -10 } : { right: -10 }),
        ...positionStyle
      }}
      className={`
        absolute
        flex h-5 w-5 items-center justify-center
        rounded-full bg-white
        border-2 shadow-sm
        transition-all duration-200
        z-10
        ${topOffset === undefined ? "top-1/2 -translate-y-1/2" : ""}
        ${
          connected
            ? "border-blue-500 scale-110"
            : (isTarget ? "border-gray-300 hover:border-blue-400" : "border-blue-400 hover:border-blue-600 hover:scale-125 hover:shadow-md")
        }
      `}
    >
      {/* Inner dot */}
      <span
        className={`
          block h-2 w-2 rounded-full
          transition-colors duration-200
          ${connected ? "bg-blue-500" : (isTarget ? "bg-gray-200" : "bg-blue-300 group-hover:bg-blue-500")}
        `}
      />
    </button>
  )
}
