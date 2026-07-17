"use client"

import React, { useRef, useEffect, useState } from "react"
import { LayoutGrid, Image as ImageIcon } from "lucide-react"
import ConnectorHandle from "./ConnectorHandle"

export interface CarouselCardButton {
  id: string
  label: string
  action: string // 'Go to Block', 'Go to Intent', etc.
}

export interface CarouselCard {
  id: string
  imageType: 'upload' | 'link'
  imageUrl: string
  title: string
  description: string
  buttons: CarouselCardButton[]
}

export interface CarouselNodeData {
  id: string
  type: 'carousel'
  position: { x: number; y: number }
  cards: CarouselCard[]
}

// Layout constants for CanvasEdges.tsx
export const CAROUSEL_WIDTH = 256;
export const CAROUSEL_HEADER_H = 33;

interface CarouselNodeProps {
  data: CarouselNodeData
  isActive: boolean
  onClick: (e: React.MouseEvent) => void
  onPortMouseDown?: (e: React.MouseEvent, handleId?: string) => void
  onPortClick?: (e: React.MouseEvent, handleId?: string) => void
  connected?: boolean
  connectedHandles?: Set<string>
  /** Provide this so the node can bubble up its actual rendered button offsets for CanvasEdges */
  onUpdateOffsets?: (nodeId: string, offsets: Record<string, number>) => void
}

export default function CarouselNode({
  data,
  isActive,
  onClick,
  onPortMouseDown,
  onPortClick,
  connected = false,
  connectedHandles = new Set(),
  onUpdateOffsets,
}: CarouselNodeProps) {
  const hasCards = data.cards && data.cards.length > 0
  
  // Use a ref to the container to calculate exact Y offsets of buttons
  const containerRef = useRef<HTMLDivElement>(null)
  const [buttonOffsets, setButtonOffsets] = useState<Record<string, number>>({})

  // Compute button offsets exactly from the DOM to avoid complex CSS calculation
  useEffect(() => {
    if (!containerRef.current) return;
    
    const newOffsets: Record<string, number> = {};
    const containerTop = containerRef.current.getBoundingClientRect().top;
    
    // Find all buttons inside this node
    const buttonElements = containerRef.current.querySelectorAll('[data-carousel-btn]');
    buttonElements.forEach((el) => {
      const btnId = el.getAttribute('data-carousel-btn') as string;
      const rect = el.getBoundingClientRect();
      const relativeCenterY = (rect.top - containerTop) + (rect.height / 2);
      newOffsets[btnId] = relativeCenterY;
    });

    // Compare with current to avoid infinite loop
    const changed = Object.keys(newOffsets).some(k => newOffsets[k] !== buttonOffsets[k]) || 
                    Object.keys(buttonOffsets).length !== Object.keys(newOffsets).length;
                    
    if (changed) {
      setButtonOffsets(newOffsets);
      if (onUpdateOffsets) {
        onUpdateOffsets(data.id, newOffsets);
      }
    }
  }, [data.cards]); // Re-run when cards change

  return (
    <div className="relative flex items-start select-none" ref={containerRef}>
      {/* ── Card Container ─────────────────────────────────────────────────────────── */}
      <div
        onClick={onClick}
        className={`
          w-64 rounded-xl border-2 bg-gray-50 shadow-sm transition-all cursor-pointer flex flex-col
          ${isActive ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2 rounded-t-xl" style={{ height: CAROUSEL_HEADER_H }}>
          <LayoutGrid className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-semibold text-gray-700">Carousel</span>
        </div>

        {/* Body / Cards */}
        <div className="flex flex-col gap-3 p-2 bg-gray-50 rounded-b-xl overflow-hidden">
          {!hasCards ? (
            <div className="text-center p-4 bg-white rounded-lg border border-dashed border-gray-300 text-gray-400 text-xs">
              No cards added
            </div>
          ) : (
            data.cards.map((card) => (
              <div key={card.id} className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                
                {/* Image Area */}
                <div 
                  className="flex items-center justify-center bg-gray-100 overflow-hidden h-28"
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-300 h-8 w-8" />
                  )}
                </div>

                {/* Text Area */}
                <div className="px-3 py-2 flex flex-col gap-0.5">
                  <span className="font-semibold text-gray-800 text-sm truncate min-h-[20px]">
                    {card.title || 'Untitled Card'}
                  </span>
                  <span className="text-xs text-gray-500 truncate min-h-[16px]">
                    {card.description || 'No description'}
                  </span>
                </div>

                {/* Buttons Area */}
                {card.buttons && card.buttons.length > 0 && (
                  <div className="flex flex-col gap-1.5 px-2 pb-2">
                    {card.buttons.map((btn) => (
                      <div
                        key={btn.id}
                        data-carousel-btn={btn.id}
                        className="flex items-center justify-center rounded border border-gray-200 bg-white px-2 h-9 text-xs font-medium text-blue-600 shadow-sm transition hover:bg-gray-50"
                      >
                        {btn.label || 'Button'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Port handles ─────────────────────────────────────────────────── */}
      {!hasCards ? (
        // Default handle if empty
        <ConnectorHandle
          connected={connected}
          onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
          onClick={onPortClick ?? ((e) => e.preventDefault())}
        />
      ) : (
        // Generate a handle for each button, using the DOM-calculated Y offsets
        data.cards.flatMap((card) => {
          if (!card.buttons) return [];
          
          return card.buttons.map((btn) => {
            const yOffset = buttonOffsets[btn.id];
            
            // Render hidden initially until layout provides the exact yOffset
            if (yOffset === undefined) return null;

            return (
              <ConnectorHandle
                key={btn.id}
                handleId={btn.id}
                topOffset={yOffset}
                connected={connectedHandles.has(btn.id)}
                onMouseDown={onPortMouseDown ?? ((e) => e.preventDefault())}
                onClick={onPortClick ?? ((e) => e.preventDefault())}
              />
            );
          });
        })
      )}
    </div>
  )
}
