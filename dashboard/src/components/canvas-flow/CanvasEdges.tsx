import React, { useState } from 'react';
import {
  MSG_NODE_HEADER_H,
  MSG_NODE_BODY_H,
  MSG_BUTTON_H,
  MSG_BUTTON_GAP,
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
const START_WIDTH  = 130;
const START_HEIGHT = 40;
const MSG_WIDTH    = 256;
const MSG_DEFAULT_CENTER_Y = MSG_NODE_HEADER_H + MSG_NODE_BODY_H / 2;

// ── Color palette ─────────────────────────────────────────────────────────────
const C_IDLE_START  = '#60a5fa'; // blue-400
const C_IDLE_END    = '#a78bfa'; // violet-400
const C_ACTIVE      = '#3b82f6'; // blue-500
const C_ARROW_IDLE  = '#94a3b8'; // slate-400
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
  /** For playbook_reference nodes — resolved by CanvasEdges to get exit condition ports */
  playbookId?: string;
  [key: string]: any;
}

interface CanvasEdgesProps {
  edges: Edge[];
  nodes: CanvasNode[];
  startNodePos: { x: number; y: number };
  selectedEdgeId?: string | null;
  onSelectEdge?: (edgeId: string | null) => void;
  onDeleteEdge?: (edgeId: string) => void;
  /** Pass the full playbook store so edges can resolve exit-condition port positions */
  getPlaybook?: (id: string) => { exitConditions: ExitCondition[] } | undefined;
  /** Pass the agent store so edges can resolve agent exit-condition port positions */
  getAgent?: (id: string) => { exitConditions: ExitCondition[] } | undefined;
}

// ── Bezier helpers ────────────────────────────────────────────────────────────
function getBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const offset = Math.min(Math.max(dx * 0.5, 80), 240);
  return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
}

function getBezierMidpoint(
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
  getPlaybook, getAgent,
}: CanvasEdgesProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full"
      overflow="visible"
      style={{ zIndex: 10 }}
    >
      <defs>
        {/* ── Upgrade 1: Flow animation keyframes ──────────────────────────────── */}
        <style>{`
          @keyframes edge-flow {
            from { stroke-dashoffset: 24; }
            to   { stroke-dashoffset: 0;  }
          }
          @keyframes port-pulse {
            0%   { r: 6;  opacity: 0.7; }
            60%  { r: 12; opacity: 0;   }
            100% { r: 12; opacity: 0;   }
          }
          .edge-animated {
            stroke-dasharray: 6 4;
            animation: edge-flow 0.55s linear infinite;
          }
          .edge-animated-selected {
            stroke-dasharray: 8 5;
            animation: edge-flow 0.45s linear infinite;
          }
          .port-glow-ring {
            animation: port-pulse 1.2s ease-out infinite;
            pointer-events: none;
          }
        `}</style>

        {/* ── Arrowhead markers ──────────────────────────────────────────────── */}
        <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 2 L 9 5 L 0 8 z" fill={C_ARROW_IDLE} />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 2 L 9 5 L 0 8 z" fill={C_ARROW_ACT} />
        </marker>

        {/* ── Upgrade 3: Per-edge gradient defs ─────────────────────────────── */}
        {edges.map((edge) => {
          // We need source coords for gradient, but we compute them in the main map.
          // Use a stable gradient id keyed to the edge id. Coords are set below
          // via the per-edge <linearGradient> rendered dynamically.
          return null;
        })}
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
              // No exit conditions — single default port at mid-body
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
              edgeLabel = pb!.exitConditions[exitIdx].description.slice(0, 18)
            } else {
              // No exit conditions — single default port centered in body
              y1 = sourceNode.position.y + PB_NODE_HEADER_H + PB_NODE_BODY_H / 2;
            }
          } else {
            // ── message node source port ──────────────────────────────────
            x1 = sourceNode.position.x + MSG_WIDTH;
            if (edge.sourceHandleId && sourceNode.buttons?.length) {
              const btnIdx = sourceNode.buttons.findIndex((b) => b.id === edge.sourceHandleId);
              if (btnIdx === -1) return null;
              y1 =
                sourceNode.position.y +
                MSG_NODE_HEADER_H + MSG_NODE_BODY_H +
                btnIdx * (MSG_BUTTON_H + MSG_BUTTON_GAP) +
                MSG_BUTTON_H / 2;
              edgeLabel = sourceNode.buttons[btnIdx].label;
            } else {
              y1 = sourceNode.position.y + MSG_DEFAULT_CENTER_Y;
            }
          }
        }

        // ── 2. Target point ────────────────────────────────────────────────
        const targetNode = nodes.find((n) => n.id === edge.to);
        if (!targetNode) return null;
        let x2: number, y2: number;
        if (targetNode.type === 'agent') {
          // Input port: left edge of agent node, centered in header+body
          x2 = targetNode.position.x;
          y2 = targetNode.position.y + AG_NODE_HEADER_H + AG_NODE_BODY_H / 2;
        } else if (targetNode.type === 'playbook_reference') {
          // Input port: left edge of the playbook node, centered vertically in header+body
          x2 = targetNode.position.x;
          y2 = targetNode.position.y + PB_NODE_HEADER_H + PB_NODE_BODY_H / 2;
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

        // IDs for the per-edge gradient
        const gradId    = `grad-${edge.id}`;
        const strokeUrl = `url(#${gradId})`;
        const markerUrl = isActive ? 'url(#arrow-active)' : 'url(#arrow-default)';
        const strokeWidth = isSelected ? 2.5 : 1.75;

        // Flow animation class
        const animClass = isSelected
          ? 'edge-animated-selected'
          : isHovered
          ? 'edge-animated'
          : '';

        return (
          <g key={edge.id}>

            {/* ── Upgrade 3: Inline per-edge gradient ──────────────────────
                 gradientUnits=userSpaceOnUse means x1/y1/x2/y2 are in
                 the same coordinate system as the path points. */}
            <defs>
              <linearGradient
                id={gradId}
                gradientUnits="userSpaceOnUse"
                x1={x1} y1={y1} x2={x2} y2={y2}
              >
                <stop offset="0%"   stopColor={isActive ? C_ACTIVE : C_IDLE_START} />
                <stop offset="100%" stopColor={isActive ? C_ACTIVE : C_IDLE_END}   />
              </linearGradient>
            </defs>

            {/* ── Upgrade 4: Port glow rings at source + target ─────────────
                 Only visible when this edge is hovered or selected. */}
            {isActive && (
              <>
                {/* Source port glow */}
                <circle
                  cx={x1} cy={y1}
                  r={6}
                  fill="none"
                  stroke={C_ACTIVE}
                  strokeWidth={2}
                  opacity={0.6}
                  className="port-glow-ring"
                />
                {/* Target port glow */}
                <circle
                  cx={x2} cy={y2}
                  r={6}
                  fill="none"
                  stroke={isActive ? C_IDLE_END : C_IDLE_START}
                  strokeWidth={2}
                  opacity={0.6}
                  className="port-glow-ring"
                  style={{ animationDelay: '0.3s' }}
                />
              </>
            )}

            {/* ── Invisible hit-area (18px wide, pointer-events: stroke) ─── */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth={18}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredEdgeId(edge.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEdge?.(isSelected ? null : edge.id);
              }}
            />

            {/* ── Upgrade 3 + 1: Gradient visible path + flow animation ─── */}
            <path
              d={pathData}
              fill="none"
              stroke={strokeUrl}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              markerEnd={markerUrl}
              className={animClass}
              style={{
                pointerEvents: 'none',
                transition: 'stroke-width 0.15s',
                // Non-animated fallback stroke so the path is always visible
                ...(animClass ? {} : {}),
              }}
            />

            {/* ── Upgrade 2: Edge label pill ───────────────────────────────
                 Show a pill with the button label next to the midpoint.
                 Offset slightly upward (-14px) so it sits above the curve. */}
            {edgeLabel && (
              <g
                transform={`translate(${mx}, ${my - 14})`}
                style={{ pointerEvents: 'none' }}
              >
                {/* Pill background */}
                <rect
                  x={-20} y={-9} width={40} height={18} rx={9}
                  fill={isActive ? C_ACTIVE : '#64748b'}
                  opacity={isActive ? 1 : 0.85}
                />
                {/* Label text */}
                <text
                  x={0} y={4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  fill="white"
                  letterSpacing={0.3}
                >
                  {edgeLabel.toUpperCase()}
                </text>
              </g>
            )}

            {/* ── Delete button at midpoint (selected only) ─────────────── */}
            {isSelected && (
              <g
                transform={`translate(${mx + (edgeLabel ? 26 : 0)}, ${my})`}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onDeleteEdge?.(edge.id); }}
              >
                <circle r={10} fill="white" stroke={C_ACTIVE} strokeWidth={1.5} />
                <line x1={-4} y1={-4} x2={4} y2={4} stroke={C_ACTIVE} strokeWidth={1.75} strokeLinecap="round" />
                <line x1={4} y1={-4} x2={-4} y2={4} stroke={C_ACTIVE} strokeWidth={1.75} strokeLinecap="round" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}


