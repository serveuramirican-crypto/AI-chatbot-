"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Database, Settings, Code, MessageSquare, Terminal } from "lucide-react"

const navigation = [
  { name: 'Knowledge Base', href: '/knowledge-base', icon: Database },
  { name: 'Widget Designer', href: '/widget-designer', icon: Settings },
  { name: 'Script Generator', href: '/script-generator', icon: Code },
  { name: 'Chat Playground', href: '/playground', icon: Terminal },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-50 border-r border-gray-200">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
        <span className="text-xl font-bold text-gray-900">AI Chatbot</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 space-y-1 px-4 py-4">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md
                  ${isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
              >
                <item.icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
