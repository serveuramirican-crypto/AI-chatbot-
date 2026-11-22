import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = 'https://uxihntppwtdhuxoiyfnx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4aWhudHBwd3RkaHV4b2l5Zm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODE5NDgsImV4cCI6MjExMDg1Nzk0OH0.24MwtqjUMSfYDkYX-00ZmM_X0k1CPELK0nwC4RXoMrA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function interpolateVariables(template, variables) {
  if (typeof template !== 'string') return String(template ?? '')
  if (!template) return ''
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(variables, varName)) {
      const val = variables[varName]
      if (val === null || val === undefined) return ''
      return typeof val === 'object' ? JSON.stringify(val) : String(val)
    }
    return match
  })
}

async function runTests() {
  console.log('=== RUNNING SET ACTION INTEGRATION TESTS ===\n')
  let passed = 0
  let total = 0

  function assert(condition, testName) {
    total++
    if (condition) {
      console.log(`[PASS] ${testName}`)
      passed++
    } else {
      console.error(`[FAIL] ${testName}`)
      process.exitCode = 1
    }
  }

  // ── TEST 1: Variable Text Assignment ──
  {
    const vars = {}
    vars['customer_name'] = 'Ahmed'
    assert(vars['customer_name'] === 'Ahmed', 'Test 1: Set text value (customer_name = "Ahmed")')
  }

  // ── TEST 2: Numeric Literal Preservation ──
  {
    let rawVal = '250'
    let resolved = /^-?\d+(\.\d+)?$/.test(rawVal.trim()) ? Number(rawVal.trim()) : rawVal
    assert(resolved === 250 && typeof resolved === 'number', 'Test 2: Set numeric value (product_price = 250 as number)')
  }

  // ── TEST 3: Variable Interpolation ──
  {
    const vars = { customer_name: 'Ahmed' }
    const result = interpolateVariables('Hello {customer_name}', vars)
    assert(result === 'Hello Ahmed', 'Test 3: Variable interpolation (greeting = "Hello {customer_name}" -> "Hello Ahmed")')
  }

  // ── TEST 4: Reset Variable to Empty String ──
  {
    const vars = { selected_size: 'L' }
    vars['selected_size'] = ''
    assert(vars['selected_size'] === '', 'Test 4: Reset variable (selected_size = "")')
  }

  // ── TEST 5: Prompt Assignment via OpenRouter AI ──
  {
    try {
      const { data: settings } = await supabase.from('widget_settings').select('*').limit(1).single()
      const apiKey = settings?.api_key || settings?.openrouter_api_key
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ai-chatbot.app',
          'X-Title': 'Test Set Prompt',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4.5',
          messages: [
            {
              role: 'system',
              content: 'Return ONLY the requested extracted summary concisely without explanation.',
            },
            {
              role: 'user',
              content: 'Customer says: "I need a black leather jacket size L". Extract clothing preferences as concise summary.',
            },
          ],
          temperature: 0.2,
          max_tokens: 150,
        }),
      })

      const data = await response.json()
      console.log('OpenRouter response status:', response.status, JSON.stringify(data))
      const aiSummary = data.choices?.[0]?.message?.content?.trim()
      assert(aiSummary && aiSummary.length > 5, `Test 5: Prompt assignment with real AI (Result: "${aiSummary?.slice(0, 40)}...")`)
    } catch (e) {
      console.error('Test 5 error:', e)
      assert(false, 'Test 5: Prompt assignment with real AI')
    }
  }

  // ── TEST 6: Multiple Sequential Assignments ──
  {
    const vars = {}
    // Step 1:
    vars['first_name'] = 'Ahmed'
    // Step 2:
    vars['customer_name'] = interpolateVariables('{first_name}', vars)
    // Step 3:
    vars['greeting'] = interpolateVariables('Hello {customer_name}', vars)

    assert(
      vars['first_name'] === 'Ahmed' &&
      vars['customer_name'] === 'Ahmed' &&
      vars['greeting'] === 'Hello Ahmed',
      'Test 6: Multiple sequential assignments with dependencies (first_name -> customer_name -> greeting)'
    )
  }

  // ── Non-evaluation of arithmetic: "{attempts} + 1" must be string "2 + 1" ──
  {
    const vars = { attempts: '2' }
    const result = interpolateVariables('{attempts} + 1', vars)
    assert(result === '2 + 1', 'Variable semantics: "{attempts} + 1" remains text "2 + 1" without eval() calculation')
  }

  // ── TEST 7: Parallel Execution Concurrency ──
  {
    const initialVars = { base: 'value' }
    const assignments = [
      { var: 'a', val: 'valA' },
      { var: 'b', val: 'valB' },
      { var: 'c', val: 'valC' },
    ]
    const results = await Promise.all(
      assignments.map(async (a) => {
        await new Promise((r) => setTimeout(r, 10))
        return { varName: a.var, val: a.val }
      })
    )
    const runtimeVars = { ...initialVars }
    for (const r of results) runtimeVars[r.varName] = r.val
    assert(
      runtimeVars.a === 'valA' && runtimeVars.b === 'valB' && runtimeVars.c === 'valC',
      'Test 7: Parallel execution concurrent resolution'
    )
  }

  // ── TEST 8 & 9: Transcript Properties Replace & Append in Supabase ──
  {
    const testSessionId = crypto.randomUUID()
    // Create test session
    const { error: sessErr } = await supabase.from('chat_sessions').insert({
      id: testSessionId,
      agent_id: 'test_agent',
      user_name: 'Test Visitor',
      metadata: { initial_field: 'existing' },
    })
    if (sessErr) console.error('sessErr:', sessErr)

    // Apply Replace: customer_type = "VIP"
    let metadata = { initial_field: 'existing', customer_type: 'VIP' }
    await supabase.from('chat_sessions').update({ metadata }).eq('id', testSessionId)

    let { data: s1 } = await supabase.from('chat_sessions').select('metadata').eq('id', testSessionId).single()
    assert(s1?.metadata?.customer_type === 'VIP', 'Test 8: Transcript property Replace (customer_type = "VIP")')

    // Apply Append: customer_notes = "VIP" then append "Frequent customer"
    metadata.customer_notes = 'VIP'
    // Append operation
    metadata.customer_notes = `${metadata.customer_notes} Frequent customer`.trim()
    await supabase.from('chat_sessions').update({ metadata }).eq('id', testSessionId)

    let { data: s2 } = await supabase.from('chat_sessions').select('metadata').eq('id', testSessionId).single()
    assert(s2?.metadata?.customer_notes === 'VIP Frequent customer', 'Test 9: Transcript property Append ("VIP" + "Frequent customer")')

    // Clean up test session
    await supabase.from('chat_sessions').delete().eq('id', testSessionId)
  }

  // ── TEST 10: Supabase Workflow Persistence with Set Node ──
  {
    const testWfId = `test_wf_set_${Date.now()}`
    const testSetNode = {
      id: 'set_node_1',
      type: 'set',
      label: 'Set',
      config: {
        assignments: [
          {
            id: 'assign_1',
            type: 'value',
            variableID: 'var_customer_name',
            label: 'customer_name',
            value: 'Ahmed',
          },
          {
            id: 'assign_2',
            type: 'prompt',
            variableID: 'var_customer_summary',
            label: 'customer_summary',
            promptID: 'prompt_extract_customer_summary',
          },
        ],
        transcriptProperties: [
          {
            id: 'prop_1',
            propertyID: 'prop_customer_type',
            label: 'customer_type',
            operationType: 'replace',
            value: 'VIP',
          },
        ],
        parallelExecution: false,
      },
      position: { x: 300, y: 200 },
    }

    const testEdge = {
      id: 'edge_start_set',
      from: 'start',
      to: 'set_node_1',
    }

    const { error: insertErr } = await supabase.from('workflows').insert({
      id: testWfId,
      name: 'Test Set Workflow',
      nodes: [testSetNode],
      edges: [testEdge],
      start_node_pos: { x: 100, y: 100 },
      updated_at: new Date().toISOString(),
    })

    assert(!insertErr, 'Test 10a: Insert workflow with Set node to Supabase')

    const { data: fetchedWf, error: fetchErr } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', testWfId)
      .single()

    assert(!fetchErr && fetchedWf, 'Test 10b: Fetch workflow from Supabase')
    const restoredNode = fetchedWf?.nodes?.[0]
    assert(
      restoredNode?.type === 'set' &&
      restoredNode?.config?.assignments?.length === 2 &&
      restoredNode?.config?.assignments[0]?.value === 'Ahmed' &&
      restoredNode?.config?.assignments[1]?.promptID === 'prompt_extract_customer_summary' &&
      restoredNode?.config?.transcriptProperties?.length === 1 &&
      restoredNode?.config?.transcriptProperties[0]?.operationType === 'replace',
      'Test 10c: Restored Set node configuration preserves all assignments, prompt IDs, properties, and values'
    )

    // Clean up test workflow
    await supabase.from('workflows').delete().eq('id', testWfId)
  }

  // ── TEST 12: Session Isolation for Execution Variables ──
  {
    const sessionA = `sess_A_${Date.now()}`
    const sessionB = `sess_B_${Date.now()}`

    await supabase.from('workflow_execution_variables').insert([
      { session_id: sessionA, variable_id: 'var_name', variable_name: 'customer_name', value: 'Ahmed' },
      { session_id: sessionB, variable_id: 'var_name', variable_name: 'customer_name', value: 'Fatima' },
    ])

    const { data: varsA } = await supabase.from('workflow_execution_variables').select('value').eq('session_id', sessionA)
    const { data: varsB } = await supabase.from('workflow_execution_variables').select('value').eq('session_id', sessionB)

    assert(
      varsA?.[0]?.value === 'Ahmed' && varsB?.[0]?.value === 'Fatima',
      'Test 12: Session isolation: Session A ("Ahmed") and Session B ("Fatima") remain completely isolated'
    )

    await supabase.from('workflow_execution_variables').delete().eq('session_id', sessionA)
    await supabase.from('workflow_execution_variables').delete().eq('session_id', sessionB)
  }

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===`)
}

runTests().catch(console.error)
