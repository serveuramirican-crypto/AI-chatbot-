"use client"

import React, { useState } from "react"
import {
  ChevronRight,
  Bot,
  FileCode,
  Wrench,
  GitBranch,
  MessageSquare,
  CreditCard,
  LayoutGrid,
  MousePointerClick,
  Mic,
  Sparkles,
} from "lucide-react"

interface ActionsDropdownProps {
  onClose?: () => void
  onActionSelect?: (label: string) => void
}

interface ActionItem {
  icon: React.ReactNode
  label: string
  children?: ActionItem[]
}

const actions: ActionItem[] = [
  {
    icon: <Bot className="h-4 w-4 text-gray-500" />,
    label: "Agentic",
    children: [
      { icon: <Bot className="h-4 w-4 text-blue-500" />,        label: "AI Agent" },
      { icon: <Sparkles className="h-4 w-4 text-violet-500" />, label: "Playbook" },
    ],
  },
  {
    icon: <FileCode className="h-4 w-4 text-gray-500" />,
    label: "Scripted",
    children: [
      { icon: <MessageSquare className="h-4 w-4 text-gray-500" />, label: "Message" },
      { icon: <CreditCard className="h-4 w-4 text-gray-500" />, label: "Cards" },
      { icon: <LayoutGrid className="h-4 w-4 text-gray-500" />, label: "Carousel" },
      { icon: <MousePointerClick className="h-4 w-4 text-gray-500" />, label: "Buttons" },
      { icon: <Mic className="h-4 w-4 text-gray-500" />, label: "Listen" },
    ]
  },
  {
    icon: <Wrench className="h-4 w-4 text-gray-500" />,
    label: "Tools",
  },
  {
    icon: <GitBranch className="h-4 w-4 text-gray-500" />,
    label: "Logic",
  },
]

/**
 * Actions Dropdown — context menu that appears at the terminal end of a
 * connector line, allowing the user to add new workflow nodes.
 */
export default function ActionsDropdown({ onClose, onActionSelect }: ActionsDropdownProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <div className="w-52 rounded-xl bg-white shadow-xl ring-1 ring-black/5 relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <span className="text-sm font-semibold text-gray-800">Actions</span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>

      {/* Items */}
      <ul className="py-1">
        {actions.map((item) => (
          <li 
            key={item.label}
            className="relative"
            onMouseEnter={() => setHoveredItem(item.label)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <button className="flex w-full items-center justify-between px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50">
              <span className="flex items-center gap-3">
                {item.icon}
                {item.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {/* Sub-menu */}
            {item.children && hoveredItem === item.label && (
              <div className="absolute left-full top-0 ml-1 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black/5 py-1 z-10">
                <ul>
                  {item.children.map((child) => (
                    <li key={child.label}>
                      <button 
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onActionSelect) onActionSelect(child.label)
                        }}
                      >
                        {child.icon}
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

