"use client"

import React, { useState } from "react"
import {
  Sparkles,
  Plus,
  Search,
  BookOpen,
  Trash2,
  Clock,
  CheckCircle2,
  FileEdit,
} from "lucide-react"
import type { Playbook } from "@/types/playbook"
import { usePlaybooks, usePlaybookActions } from "@/lib/playbookStore"
import PlaybookEditor from "./PlaybookEditor"

const MODEL_CHIP: Record<string, string> = {
  'gpt-4o':            'GPT-4o',
  'gpt-4o-mini':       '4o mini',
  'claude-3-5-sonnet': 'Sonnet',
  'claude-3-5-haiku':  'Haiku',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/**
 * PlaybookLibrary — split-panel route component.
 * Left: searchable list of all playbooks.
 * Right: PlaybookEditor (or empty state).
 */
export default function PlaybookLibrary() {
  const playbooks = usePlaybooks()
  const { createPlaybook, deletePlaybook } = usePlaybookActions()

  const [selectedId, setSelectedId] = useState<string | null>(
    playbooks[0]?.id ?? null
  )
  const [query, setQuery] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = playbooks.filter(p =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.trigger.toLowerCase().includes(query.toLowerCase())
  )

  const selected = playbooks.find(p => p.id === selectedId) ?? null

  const handleNew = () => {
    const nb = createPlaybook({
      title:          'Untitled Playbook',
      model:          'gpt-4o-mini',
      trigger:        '',
      instructions:   '',
      tools:          [],
      exitConditions: [],
      status:         'draft',
    })
    setSelectedId(nb.id)
  }

  const handleDelete = (id: string) => {
    if (selectedId === id) setSelectedId(playbooks.find(p => p.id !== id)?.id ?? null)
    deletePlaybook(id)
    setConfirmDelete(null)
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#0f1117]">

      {/* ── Left rail — library list ─────────────────────────────────────────── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/8">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Playbooks</span>
            <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] font-bold text-white/50">
              {playbooks.length}
            </span>
          </div>
          <button
            onClick={handleNew}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400 transition hover:bg-violet-600/40 hover:text-violet-300"
            title="New playbook"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-4 py-2.5 border-b border-white/6">
          <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
            <input
              className="w-full bg-transparent text-xs text-white/70 placeholder-white/25 outline-none"
              placeholder="Search playbooks…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <nav className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-5 py-4 text-xs text-white/30 italic">No playbooks found.</p>
          )}
          {filtered.map(pb => (
            <PlaybookRow
              key={pb.id}
              playbook={pb}
              isSelected={selectedId === pb.id}
              onSelect={() => setSelectedId(pb.id)}
              onDeleteRequest={() => setConfirmDelete(pb.id)}
            />
          ))}
        </nav>

        {/* New playbook CTA at bottom */}
        <div className="shrink-0 border-t border-white/8 p-3">
          <button
            onClick={handleNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-500/30 py-2.5 text-xs font-medium text-violet-400/70 transition hover:border-violet-500/60 hover:text-violet-400"
          >
            <Plus className="h-3.5 w-3.5" />
            New Playbook
          </button>
        </div>
      </aside>

      {/* ── Right panel — editor ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {selected ? (
          <PlaybookEditor
            key={selected.id}
            playbook={selected}
            onClose={() => setSelectedId(null)}
            onSaved={saved => setSelectedId(saved.id)}
          />
        ) : (
          <EmptyState onNew={handleNew} />
        )}
      </div>

      {/* ── Delete confirm dialog ────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-[#1c1f28] p-6 shadow-2xl w-80">
            <h3 className="text-sm font-semibold text-white mb-2">Delete Playbook?</h3>
            <p className="text-xs text-white/50 mb-5">
              Any canvas nodes referencing this playbook will show a dangling-reference warning.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-white/10 px-4 py-1.5 text-xs text-white/60 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PlaybookRow ────────────────────────────────────────────────────────────────

function PlaybookRow({
  playbook, isSelected, onSelect, onDeleteRequest,
}: {
  playbook: Playbook
  isSelected: boolean
  onSelect: () => void
  onDeleteRequest: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        group relative flex w-full flex-col gap-0.5 px-4 py-3 text-left transition
        ${isSelected ? 'bg-violet-600/12 border-l-2 border-violet-500' : 'border-l-2 border-transparent hover:bg-white/4'}
      `}
    >
      {/* Title row */}
      <div className="flex items-center gap-2 pr-6">
        {playbook.status === 'published'
          ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
          : <FileEdit className="h-3 w-3 shrink-0 text-amber-400" />
        }
        <span className={`truncate text-xs font-semibold ${isSelected ? 'text-violet-300' : 'text-white/75'}`}>
          {playbook.title}
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] font-bold text-white/40">
          {MODEL_CHIP[playbook.model] ?? playbook.model}
        </span>
      </div>

      {/* Trigger preview */}
      {playbook.trigger && (
        <p className="truncate text-[11px] text-white/30 pl-5">
          {playbook.trigger}
        </p>
      )}

      {/* Timestamp */}
      <div className="flex items-center gap-1 pl-5 mt-0.5">
        <Clock className="h-2.5 w-2.5 text-white/20" />
        <span className="text-[10px] text-white/20">{timeAgo(playbook.updatedAt)}</span>
        {playbook.isTemplate && (
          <span className="ml-1 rounded bg-violet-900/40 px-1 text-[9px] font-bold uppercase tracking-wide text-violet-400/70">
            template
          </span>
        )}
      </div>

      {/* Delete button on hover */}
      {hovered && !isSelected && (
        <button
          onClick={e => { e.stopPropagation(); onDeleteRequest() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-red-400 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      {isSelected && (
        <button
          onClick={e => { e.stopPropagation(); onDeleteRequest() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400/40 hover:text-red-400 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </button>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/10 border border-violet-500/20">
        <Sparkles className="h-8 w-8 text-violet-500/50" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white/60">No playbook selected</h3>
        <p className="mt-1 text-xs text-white/30">
          Select one from the list or create a new playbook.
        </p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow transition hover:bg-violet-500"
      >
        <Plus className="h-3.5 w-3.5" />
        New Playbook
      </button>
    </div>
  )
}
