export type AgentStatus = 'idle' | 'analyzing' | 'action_pending' | 'executing';

export interface SensorData {
  timestamp: string;
  line: string;
  equipment: string;
  vibration: number;
  temperature: number;
  current_amp: number;
  defect_rate: number;
  status: 'normal' | 'warning' | 'danger';
}

export interface AgentDecision {
  agent: string;
  action: string;
  target_equipment: string;
  recommended_value: number | string;
  adjusted_value?: number | string;
  operator_notes?: string;
  level: number;
  reasoning: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'logged';
}

export interface OverrideLog {
  id: string;
  timestamp: string;
  operator: string;
  equipment: string;
  parameter: string;
  original_value: number | string;
  new_value: number | string;
  reason: string;
  type: 'ai_adjustment' | 'manual_override';
}

export interface MenuItem {
  id: number;
  category: string;
  name: string;
  description: string;
  agent?: string;
  roles: string[];
  details?: {
    scenario?: string;
    logic?: string;
    target?: string;
    output?: string;
  };
}

export type PolicyPriority = 'Safety' | 'Quality' | 'Delivery' | 'Cost' | 'OEE';

export interface Playbook {
  id: string;
  name: string;
  triggerEvent: string;
  actions: {
    agentId: string;
    action: string;
    params: any;
  }[];
  status: 'Active' | 'Inactive';
}

export interface EvidencePack {
  id: string;
  decisionId: string;
  timestamp: string;
  goal: string;
  reasoning: string;
  dataSnapshots: {
    sensorId: string;
    value: number;
  }[];
  policyApplied: PolicyPriority;
  approver?: string;
}

export interface Goal {
  id: string;
  title: string;
  status: 'In Progress' | 'Completed' | 'Failed';
  tasks: {
    agentId: string;
    task: string;
    progress: number;
  }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface CoordinationEvent {
  id: string;
  timestamp: string;
  fromAgent: string;
  toAgent: string;
  type: 'proposal' | 'critique' | 'agreement' | 'conflict' | 'info';
  content: string;
  reasoning?: string;
  stationId?: string;
}
