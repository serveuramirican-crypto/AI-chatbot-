"use client"

import React from "react"
import { Network } from "lucide-react"
import ConnectorHandle from "./ConnectorHandle"

export interface KeyValuePair {
  key: string
  value: string
}

export interface ApiNodeData {
  id: string
  type: 'api'
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: KeyValuePair[]
  timeout: number
  asyncExecution: boolean
  captureResponse: boolean
  failurePath: boolean
  position: { x: number; y: number }
}

export const API_NODE_WIDTH = 268
export const API_NODE_HEADER_H = 38
export const API_NODE_BODY_H = 56

interface ApiNodeProps {
  data: ApiNodeData
  isActive: boolean
  onClick: (e: React.MouseEvent) => void
  onPortMouseDown?: (e: React.MouseEvent, handleId?: string) => void
  onPortClick?: (e: React.MouseEvent, handleId?: string) => void
  connected?: boolean
  connectedHandles?: Set<string>
}

export default function ApiNode({
  data,
  isActive,
  onClick,
  onPortMouseDown,
  onPortClick,
  connected = false,
  connectedHandles = new Set(),
}: ApiNodeProps) {
  const methodColors: Record<string, string> = {
    GET: 'text-blue-700 bg-blue-100/80 border-blue-200',
    POST: 'text-emerald-700 bg-emerald-100/80 border-emerald-200',
    PUT: 'text-orange-700 bg-orange-100/80 border-orange-200',
    PATCH: 'text-amber-700 bg-amber-100/80 border-amber-200',
    DELETE: 'text-rose-700 bg-rose-100/80 border-rose-200',
  }

  return (
    <div className="relative flex items-start select-none group">
      <div
        onClick={onClick}
        style={{ width: API_NODE_WIDTH }}
        className={`
          rounded-2xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)]
          border transition-all duration-200 cursor-pointer overflow-hidden
          hover:shadow-[0_16px_32px_-6px_rgba(0,0,0,0.15)]
          ${isActive ? 'border-sky-500 ring-4 ring-sky-500/20 shadow-[0_0_25px_rgba(14,165,233,0.25)]' : 'border-slate-200/90 hover:border-slate-300'}
        `}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-3.5"
          style={{ height: API_NODE_HEADER_H }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-50 border border-sky-100/80 text-sky-600 shadow-xs">
              <Network className="h-3 w-3" />
            </div>
            <span className="text-xs font-bold text-slate-800 tracking-tight">API Request</span>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${methodColors[data.method] || methodColors.GET}`}>
            {data.method}
          </span>
        </div>

        {/* Body */}
        <div className="p-3" style={{ minHeight: API_NODE_BODY_H }}>
          <div className="w-full rounded-xl bg-slate-50/90 border border-slate-100/90 p-2.5">
            <p className="text-xs font-semibold text-slate-800 truncate mb-0.5">
              {data.name || "Untitled API"}
            </p>
            <p className="text-[11px] font-mono text-slate-500 truncate">
              {data.url || "https://api.example.com/v1/..."}
            </p>
          </div>
        </div>
      </div>

      {/* Main Success Port */}
      <ConnectorHandle
        connected={connectedHandles.has('success') || connected}
        onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
        onClick={onPortClick ?? ((e) => e.preventDefault())}
        handleId="success"
        color="sky"
      />

      {/* Failure Path Port (if enabled) */}
      {data.failurePath && (
        <ConnectorHandle
          handleId="fail"
          topOffset={API_NODE_HEADER_H + API_NODE_BODY_H + 16}
          connected={connectedHandles.has('fail')}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
          color="rose"
        />
      )}
    </div>
  )
}
