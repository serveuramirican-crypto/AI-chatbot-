/**
 * router.ts — Orchestrator / meta-agent
 *
 * Decides, per incoming user message, who handles it next.
 * Does NOT live inside any single playbook or canvas.
 *
 * Design choices implemented here:
 * - Q1 answer: unconnected exit port → re-classify against all playbooks
 *   (full agentic re-entry, not a hard stop)
 * - classifyTrigger is stubbed — logs to console and returns null.
 *   Replace the stub body with a real LLM API call when ready.
 */

import type {
  RouterContext,
  RoutingDecision,
  ExitCondition,
  Message,
  Playbook,
} from '@/types/playbook'

// ─────────────────────────────────────────────────────────────────────────────
// Stub: LLM trigger classification
// Replace this with a real call to your inference API.
// ─────────────────────────────────────────────────────────────────────────────

interface TriggerCandidate {
  id: string
  trigger: string
}

async function classifyTrigger(
  userMessage: string,
  candidates: TriggerCandidate[]
): Promise<TriggerCandidate | null> {
  // TODO: replace with real LLM classification call, e.g.
  //   const res = await fetch('/api/classify-trigger', {
  //     method: 'POST',
  //     body: JSON.stringify({ userMessage, candidates }),
  //   })
  //   return res.json()
  console.debug('[Router] classifyTrigger stub — no LLM call made', {
    userMessage,
    candidateCount: candidates.length,
  })
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Stub: exit condition checker
// In production, this would call an LLM to evaluate each exit condition
// against the latest user message + conversation history.
// ─────────────────────────────────────────────────────────────────────────────

export async function checkExitConditions(
  playbook: Playbook,
  userMessage: string,
  _history: Message[]
): Promise<ExitCondition | null> {
  // Keyword heuristic stub — good enough for local testing.
  // Replace with LLM-based evaluation.
  for (const condition of playbook.exitConditions) {
    const keywords = condition.description.toLowerCase().split(/\W+/)
    const msgLower = userMessage.toLowerCase()
    if (keywords.some(kw => kw.length > 3 && msgLower.includes(kw))) {
      console.debug('[Router] Exit condition matched:', condition.id, condition.description)
      return condition
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Router
// ─────────────────────────────────────────────────────────────────────────────

export async function routeNextStep(
  userMessage: string,
  context: RouterContext,
  getAllPublishedPlaybooks: () => Playbook[],
  getPlaybook: (id: string) => Playbook | undefined,
  /** nodeType at the current canvas location — needed to detect playbook_reference nodes */
  currentNodeType?: string,
): Promise<RoutingDecision> {

  // ── Case A: mid-flow on the deterministic canvas ────────────────────────────
  // Canvas edges win by default — no LLM judgment call needed,
  // UNLESS the current node is a playbook_reference (handled by case B).
  if (
    context.currentLocation.type === 'canvas_node' &&
    currentNodeType !== 'playbook_reference'
  ) {
    return { type: 'continue_canvas', nodeId: context.currentLocation.nodeId }
  }

  // ── Case B: inside (or entering) a playbook ─────────────────────────────────
  // The active playbook's instructions drive turn-by-turn behavior.
  // The Router's job here is only to check exit conditions each turn.
  if (context.currentLocation.type === 'playbook') {
    const playbook = getPlaybook(context.currentLocation.playbookId)

    if (playbook) {
      const exited = await checkExitConditions(
        playbook,
        userMessage,
        context.conversationHistory,
      )

      if (exited) {
        // Q1 decision: if the exit condition has no fallback target wired on
        // the canvas, re-classify against the whole playbook library
        // (full agentic handoff) rather than ending the conversation.
        if (!exited.fallbackTargetId) {
          console.debug('[Router] Exit fired with no fallbackTargetId — re-classifying globally')
          return routeNextStep(
            userMessage,
            { ...context, currentLocation: { type: 'unset' } },
            getAllPublishedPlaybooks,
            getPlaybook,
          )
        }
        return { type: 'exit_playbook', exitConditionId: exited.id }
      }
    }

    return {
      type: 'continue_playbook',
      playbookId: context.currentLocation.playbookId,
    }
  }

  // ── Case C: fresh / ambiguous ───────────────────────────────────────────────
  // Ask an LLM to pick the best-matching Trigger across ALL published playbooks.
  const candidates = getAllPublishedPlaybooks()
  const match = await classifyTrigger(
    userMessage,
    candidates.map(p => ({ id: p.id, trigger: p.trigger })),
  )

  return match
    ? { type: 'enter_playbook', playbookId: match.id }
    : { type: 'no_match', fallback: 'default_canvas_start' }
}
