import React, { useState } from 'react';
import {
  MSG_WIDTH,
  MSG_NODE_HEADER_H,
  MSG_NODE_BODY_H,
  MSG_BUTTON_H,
  MSG_BUTTON_GAP,
  MSG_DEFAULT_CENTER_Y,
  getMsgButtonTop,
} from './MessageNode';
import {
  PB_NODE_HEADER_H,
  PB_NODE_BODY_H,
  PB_EXIT_ROW_H,
  PB_EXIT_ROW_GAP,
  PB_NODE_WIDTH,
} from './PlaybookReferenceNode';
import {
  AG_NODE_WIDTH,
  AG_NODE_HEADER_H,
  AG_NODE_BODY_H,
  AG_EXIT_ROW_H,
  AG_EXIT_ROW_GAP,
} from './AgentNode';

// ── Layout constants ────────────────────────────────────────────────────────────
export const START_WIDTH  = 138;
export const START_HEIGHT = 42;

// ── Color palette ─────────────────────────────────────────────────────────────
const C_IDLE_LINE   = '#94a3b8';
const C_IDLE_GLOW   = 'rgba(148, 163, 184, 0.2)';
const C_ACTIVE_LINE = '#3b82f6';
const C_ACTIVE_GLOW = 'rgba(59, 130, 246, 0.5)';
const C_ARROW_IDLE  = '#94a3b8';
const C_ARROW_ACT   = '#3b82f6';

// ── Types ─────────────────────────────────────────────────────────────────────
interface NodeButton { id: string; label: string }
interface ExitCondition { id: string; description: string }

interface Edge {
  id: string;
  from: string;
  to: string;
  sourceHandleId?: string;
}

interface CanvasNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  buttons?: NodeButton[];
  saveEntireReply?: boolean;
  playbookId?: string;
  agentId?: string;
  cards?: any[];
  [key: string]: any;
}

interface CanvasEdgesProps {
  edges: Edge[];
  nodes: CanvasNode[];
  startNodePos: { x: number; y: number };
  selectedEdgeId?: string | null;
  onSelectEdge?: (edgeId: string | null) => void;
  onDeleteEdge?: (edgeId: string) => void;
  getPlaybook?: (id: string) => { exitConditions: ExitCondition[] } | undefined;
  getAgent?: (id: string) => { exitConditions: ExitCondition[] } | undefined;
  carouselOffsets?: Record<string, Record<string, number>>;
}

// ── Bezier helpers ────────────────────────────────────────────────────────────
export function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const offset = Math.min(Math.max(dx * 0.5, 80), 240);
  return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
}

export function getBezierMidpoint(
  x1: number, y1: number, x2: number, y2: number
): { mx: number; my: number } {
  const dx = Math.abs(x2 - x1);
  const offset = Math.min(Math.max(dx * 0.5, 80), 240);
  const cp1x = x1 + offset, cp1y = y1;
  const cp2x = x2 - offset, cp2y = y2;
  const t = 0.5, mt = 0.5;
  const mx = mt*mt*mt*x1 + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*x2;
  const my = mt*mt*mt*y1 + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*y2;
  return { mx, my };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CanvasEdges({
  edges, nodes, startNodePos,
  selectedEdgeId, onSelectEdge, onDeleteEdge,
  getPlaybook, getAgent, carouselOffsets
}: CanvasEdgesProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full"
      overflow="visible"
      style={{ zIndex: 10 }}
    >
      <defs>
        {/* ── Flow animation keyframes ──────────────────────────────── */}
        <style>{`
          @keyframes edge-flow-dash {
            from { stroke-dashoffset: 24; }
            to   { stroke-dashoffset: 0;  }
          }
          @keyframes port-pulse-glow {
            0%   { r: 5;  opacity: 0.8; stroke-width: 2; }
            70%  { r: 14; opacity: 0;   stroke-width: 1; }
            100% { r: 14; opacity: 0;   stroke-width: 0; }
          }
          .canvas-edge-idle {
            stroke-dasharray: 6 4;
            animation: edge-flow-dash 1.4s linear infinite;
          }
          .canvas-edge-active {
            stroke-dasharray: 8 4;
            animation: edge-flow-dash 0.6s linear infinite;
          }
          .port-pulse-effect {
            animation: port-pulse-glow 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
            pointer-events: none;
          }
        `}</style>

        {/* ── Arrowhead markers ──────────────────────────────────────────────── */}
        <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 2 L 9 5 L 0 8 z" fill={C_ARROW_IDLE} />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={C_ARROW_ACT} />
        </marker>
      </defs>

      {edges.map((edge) => {
        // ── 1. Source point ────────────────────────────────────────────────
        let x1: number, y1: number;
        let edgeLabel = '';

        if (edge.from === 'start') {
          x1 = startNodePos.x + START_WIDTH;
          y1 = startNodePos.y + START_HEIGHT / 2;
        } else {
          const sourceNode = nodes.find((n) => n.id === edge.from);
          if (!sourceNode) return null;

          // ── agent source port ─────────────────────────────────────────
          if (sourceNode.type === 'agent') {
            x1 = sourceNode.position.x + AG_NODE_WIDTH;
            if (edge.sourceHandleId && sourceNode.agentId && getAgent) {
              const ag = getAgent(sourceNode.agentId);
              const exitIdx = ag?.exitConditions.findIndex(ec => ec.id === edge.sourceHandleId) ?? -1;
              if (exitIdx === -1) return null;
              y1 =
                sourceNode.position.y +
                AG_NODE_HEADER_H + AG_NODE_BODY_H +
                exitIdx * (AG_EXIT_ROW_H + AG_EXIT_ROW_GAP) +
                AG_EXIT_ROW_H / 2;
              edgeLabel = ag!.exitConditions[exitIdx].description.slice(0, 18);
            } else {
              y1 = sourceNode.position.y + AG_NODE_HEADER_H + AG_NODE_BODY_H / 2;
            }
          // ── playbook_reference source port ─────────────────────────────
          } else if (sourceNode.type === 'playbook_reference') {
            x1 = sourceNode.position.x + PB_NODE_WIDTH;
            if (edge.sourceHandleId && sourceNode.playbookId && getPlaybook) {
              const pb = getPlaybook(sourceNode.playbookId);
              const exitIdx = pb?.exitConditions.findIndex(ec => ec.id === edge.sourceHandleId) ?? -1;
              if (exitIdx === -1) return null;
              y1 =
                sourceNode.position.y +
                PB_NODE_HEADER_H + PB_NODE_BODY_H +
                exitIdx * (PB_EXIT_ROW_H + PB_EXIT_ROW_GAP) +
                PB_EXIT_ROW_H / 2;
              edgeLabel = pb!.exitConditions[exitIdx].description.slice(0, 18);
            } else {
              y1 = sourceNode.position.y + PB_NODE_HEADER_H + PB_NODE_BODY_H / 2;
            }
          // ── message node source port ──────────────────────────────────
          } else if (sourceNode.type === 'message' || sourceNode.type === undefined) {
            x1 = sourceNode.position.x + MSG_WIDTH;
            if (edge.sourceHandleId && sourceNode.buttons?.length) {
              const btnIdx = sourceNode.buttons.findIndex((b) => b.id === edge.sourceHandleId);
              if (btnIdx === -1) return null;
              y1 = sourceNode.position.y + getMsgButtonTop(btnIdx, Boolean(sourceNode.saveEntireReply));
              edgeLabel = sourceNode.buttons[btnIdx].label;
            } else {
              y1 = sourceNode.position.y + MSG_DEFAULT_CENTER_Y;
            }
          // ── set node source port ─────────────────────────────────────
          } else if (sourceNode.type === 'set') {
            x1 = sourceNode.position.x + 268;
            y1 = sourceNode.position.y + 38 + 34;
            edgeLabel = 'Next';
          // ── carousel node source port ─────────────────────────────────
          } else if (sourceNode.type === 'carousel') {
            x1 = sourceNode.position.x + 268;
            if (edge.sourceHandleId && carouselOffsets?.[sourceNode.id]?.[edge.sourceHandleId] !== undefined) {
              y1 = sourceNode.position.y + carouselOffsets[sourceNode.id][edge.sourceHandleId];
              let foundLabel = '';
              if (sourceNode.cards) {
                for (const c of sourceNode.cards) {
                  const b = c.buttons?.find((btn: any) => btn.id === edge.sourceHandleId);
                  if (b) {
                    foundLabel = b.label;
                    break;
                  }
                }
              }
              edgeLabel = foundLabel;
            } else {
              y1 = sourceNode.position.y + 50;
            }
          } else {
            x1 = sourceNode.position.x + 268;
            y1 = sourceNode.position.y + 50;
          }
        }

        // ── 2. Target point ────────────────────────────────────────────────
        const targetNode = nodes.find((n) => n.id === edge.to);
        if (!targetNode) return null;
        let x2: number, y2: number;
        if (targetNode.type === 'agent') {
          x2 = targetNode.position.x;
          y2 = targetNode.position.y + AG_NODE_HEADER_H + AG_NODE_BODY_H / 2;
        } else if (targetNode.type === 'playbook_reference') {
          x2 = targetNode.position.x;
          y2 = targetNode.position.y + PB_NODE_HEADER_H + PB_NODE_BODY_H / 2;
        } else if (targetNode.type === 'carousel') {
          x2 = targetNode.position.x;
          y2 = targetNode.position.y + 50;
        } else if (targetNode.type === 'set') {
          x2 = targetNode.position.x;
          y2 = targetNode.position.y + 38 + 34;
        } else {
          x2 = targetNode.position.x;
          y2 = targetNode.position.y + MSG_DEFAULT_CENTER_Y;
        }

        // ── 3. Bezier + midpoint ──────────────────────────────────────────
        const pathData  = getBezierPath(x1, y1, x2, y2);
        const { mx, my } = getBezierMidpoint(x1, y1, x2, y2);

        const isSelected = selectedEdgeId === edge.id;
        const isHovered  = hoveredEdgeId  === edge.id;
        const isActive   = isSelected || isHovered;

        const gradId    = `edge-grad-${edge.id}`;
        const markerUrl = isActive ? 'url(#arrow-active)' : 'url(#arrow-default)';
        const strokeWidth = isSelected ? 2.5 : isActive ? 2.2 : 1.75;
        const animClass = isActive ? 'canvas-edge-active' : 'canvas-edge-idle';

        // Calculate dynamic width for edge label pill
        const displayLabel = edgeLabel.toUpperCase();
        const pillWidth = Math.max(displayLabel.length * 7 + 16, 36);

        return (
          <g key={edge.id} className="transition-all duration-150">
            {/* Linear Gradient for this specific edge */}
            <defs>
              <linearGradient
                id={gradId}
                gradientUnits="userSpaceOnUse"
                x1={x1} y1={y1} x2={x2} y2={y2}
              >
                <stop offset="0%"   stopColor={isActive ? '#60a5fa' : '#cbd5e1'} />
                <stop offset="100%" stopColor={isActive ? '#3b82f6' : '#94a3b8'} />
              </linearGradient>
            </defs>

            {/* Glowing port rings when active */}
            {isActive && (
              <>
                <circle
                  cx={x1} cy={y1}
                  r={6}
                  fill="none"
                  stroke={C_ACTIVE_LINE}
                  className="port-pulse-effect"
                />
                <circle
                  cx={x2} cy={y2}
                  r={6}
                  fill="none"
                  stroke={C_ACTIVE_LINE}
                  className="port-pulse-effect"
                  style={{ animationDelay: '0.35s' }}
                />
              </>
            )}

            {/* Broad invisible hit area for mouse interaction */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredEdgeId(edge.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEdge?.(isSelected ? null : edge.id);
              }}
            />

            {/* Visible curve path with animated gradient dash flow */}
            <path
              d={pathData}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              markerEnd={markerUrl}
              className={animClass}
              style={{
                pointerEvents: 'none',
                filter: isActive
                  ? 'drop-shadow(0 0 6px rgba(59,130,246,0.5))'
                  : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              }}
            />

            {/* ── Modern Edge Label Pill (e.g. YES, NO) ─────────────────── */}
            {edgeLabel && (
              <g
                transform={`translate(${mx}, ${my - 14})`}
                style={{ pointerEvents: 'none' }}
              >
                {/* Pill Background */}
                <rect
                  x={-pillWidth / 2}
                  y={-10}
                  width={pillWidth}
                  height={20}
                  rx={10}
                  fill={isActive ? '#1d4ed8' : '#1e293b'}
                  stroke={isActive ? '#60a5fa' : '#475569'}
                  strokeWidth={1.2}
                  style={{
                    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
                  }}
                />
                {/* Text */}
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={700}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fill="#ffffff"
                  letterSpacing={0.5}
                >
                  {displayLabel}
                </text>
              </g>
            )}

            {/* ── Delete Button on Edge when Selected ─────────────────────── */}
            {isSelected && (
              <g
                transform={`translate(${mx + (edgeLabel ? pillWidth / 2 + 14 : 0)}, ${my})`}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onDeleteEdge?.(edge.id); }}
                className="transition-transform hover:scale-110"
              >
                <circle r={11} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                <line x1={-3.5} y1={-3.5} x2={3.5} y2={3.5} stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" />
                <line x1={3.5} y1={-3.5} x2={-3.5} y2={3.5} stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
