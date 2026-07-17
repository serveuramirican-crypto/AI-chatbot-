"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Database,
  Code,
  MessageSquare,
  MessageCircle,
  Terminal,
  Users,
  Workflow,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  Layout,
} from "lucide-react"

const navigation = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Client Tracking', href: '/client-tracking', icon: Users },
  { name: 'Chats', href: '/chats', icon: MessageCircle },
  { name: 'knowledge-base 101', href: '/knowledge-base', icon: Database },
  { name: 'Chat Playground', href: '/playground', icon: Terminal },
  { name: 'Canvas Flow', href: '/canvas-flow', icon: Workflow },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={`flex h-full flex-col bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'
        }`}
    >
      <div className={`flex h-16 shrink-0 items-center border-b border-gray-200 transition-all ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <MessageSquare className={`text-blue-600 shrink-0 transition-all ${isCollapsed ? 'h-6 w-6' : 'h-8 w-8 mr-3'}`} />
        {!isCollapsed && <span className="text-xl font-bold text-gray-900 truncate">AI Chatbot</span>}
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <nav className={`flex-1 space-y-1 py-4 transition-all ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`
                  group flex items-center py-2 text-sm font-medium rounded-md transition-all
                  ${isCollapsed ? 'justify-center px-0' : 'px-2'}
                  ${isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                <item.icon
                  className={`
                    h-5 w-5 shrink-0 transition-all
                    ${!isCollapsed && 'mr-3'}
                    ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                  aria-hidden="true"
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-gray-200 p-2 shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex w-full items-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all ${isCollapsed ? 'justify-center' : ''
            }`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          {!isCollapsed && <span className="ml-3 text-sm font-medium truncate">Collapse</span>}
        </button>
      </div>
    </div>
  )
}
