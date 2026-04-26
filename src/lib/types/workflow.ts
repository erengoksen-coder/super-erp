export type WorkflowTriggerType = 'manual' | 'scheduled' | 'event' | 'webhook' | 'condition'

export interface WorkflowRetryPolicy {
  maxRetries: number
  retryDelay: number
  backoffMultiplier: number
}

export interface WorkflowAction {
  id: string
  type: string
  order: number
  config: Record<string, any>
  retryPolicy?: WorkflowRetryPolicy
}

export interface WorkflowDefinition {
  id: string
  companyId: string
  name: string
  description?: string
  triggerType: WorkflowTriggerType
  triggerConfig: Record<string, any>
  actions: WorkflowAction[]
  isActive: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  triggerType: WorkflowTriggerType
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'pending'
  triggerData?: Record<string, any>
  executionContext?: Record<string, any>
  currentStep: number
  totalSteps: number
  startedAt: string
  completedAt?: string
  errorMessage?: string
  retryCount: number
  companyId: string
  createdBy: string
}
