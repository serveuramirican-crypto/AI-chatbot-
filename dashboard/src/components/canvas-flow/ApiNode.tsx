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
  body: KeyValuePair[] // dynamic input variables
  timeout: number
  asyncExecution: boolean
  captureResponse: boolean
  failurePath: boolean
  position: { x: number; y: number }
}

export const API_NODE_HEADER_H = 33
export const API_NODE_BODY_H = 52

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
    GET: 'text-blue-500 bg-blue-50',
    POST: 'text-green-500 bg-green-50',
    PUT: 'text-orange-500 bg-orange-50',
    PATCH: 'text-yellow-600 bg-yellow-50',
    DELETE: 'text-red-500 bg-red-50',
  }

  return (
    <div className="relative flex items-start select-none">
      <div
        onClick={onClick}
        className={`
          w-64 rounded-xl border-2 bg-white shadow-sm transition-all cursor-pointer
          ${isActive ? 'border-purple-500 ring-4 ring-purple-500/20' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-3 py-2 rounded-t-xl">
          <Network className="h-4 w-4 text-purple-500" />
          <span className="text-xs font-semibold text-gray-700">API Request</span>
        </div>

        {/* Body */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${methodColors[data.method] || methodColors.GET}`}>
              {data.method}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">
              {data.name || "Untitled API"}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {data.url || "No URL provided"}
          </p>
        </div>
      </div>

      {/* Main Success Port */}
      <ConnectorHandle
        connected={connectedHandles.has('success') || connected}
        onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
        onClick={onPortClick ?? ((e) => e.preventDefault())}
        handleId="success"
      />

      {/* Failure Path Port (rendered lower if enabled) */}
      {data.failurePath && (
        <ConnectorHandle
          handleId="fail"
          topOffset={API_NODE_HEADER_H + API_NODE_BODY_H + 20} // Just placing it below the main one
          connected={connectedHandles.has('fail')}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
        />
      )}
    </div>
  )
}
