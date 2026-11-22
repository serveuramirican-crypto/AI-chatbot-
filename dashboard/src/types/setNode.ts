export type AssignmentType = 'value' | 'prompt'
export type TranscriptOperationType = 'replace' | 'append'
export type VariableDataType = 'string' | 'number' | 'boolean' | 'any'

export interface VariableAssignment {
  id: string
  type: AssignmentType
  variableID: string
  label: string
  value?: string
  promptID?: string
}

export interface TranscriptPropertyAssignment {
  id: string
  propertyID: string
  label: string
  operationType: TranscriptOperationType
  value: string
}

export interface SetNodeConfig {
  assignments: VariableAssignment[]
  transcriptProperties: TranscriptPropertyAssignment[]
  parallelExecution: boolean
}

export interface SetNodeData {
  id: string
  type: 'set'
  label: string
  config: SetNodeConfig
  position: { x: number; y: number }
}

export interface WorkflowVariable {
  id: string
  workflow_id?: string | null
  name: string
  type: VariableDataType
  default_value?: string | null
  description?: string | null
}

export interface PromptResource {
  id: string
  name: string
  description?: string | null
  content: string
  model?: string | null
}

export interface TranscriptProperty {
  id: string
  name: string
  data_type: 'string' | 'number' | 'boolean'
  description?: string | null
}
