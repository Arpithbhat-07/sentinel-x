export type UserRole = 
  | 'Instructor' 
  | 'Commander' 
  | 'Recon Officer' 
  | 'Field Unit' 
  | 'Communications Officer';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface ScenarioSector {
  id: string;
  name: string;
  status: string;
  center: [number, number];
  radius: number;
}

export interface ScenarioLandmark {
  name: string;
  type: string;
  coords: [number, number];
}

export interface ScenarioUnit {
  id: string;
  role: string;
  callsign: string;
  location: [number, number];
  status: string;
}

export interface ScenarioEnvironment {
  sectors?: ScenarioSector[];
  landmarks?: ScenarioLandmark[];
  units?: ScenarioUnit[];
}

export interface Scenario {
  id: string;
  code: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration_minutes: number;
  environment_data: ScenarioEnvironment;
  communication_rules: Record<string, any>;
  information_rules: Record<string, any>;
  initial_conditions: Record<string, any>;
  timed_events: any[];
  objectives: string[];
  evaluation_criteria: string[];
  is_template?: boolean;
}

export interface Participant {
  id: string;
  exercise_id: string;
  role: UserRole;
  display_name: string;
  status: 'READY' | 'CONNECTED' | 'DISCONNECTED';
  is_simulated: boolean;
  joined_at: string;
  last_seen: string;
}

export interface Exercise {
  id: string;
  code: string;
  scenario_id: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  start_time?: string;
  end_time?: string;
  elapsed_seconds: number;
  comms_reliability: number;
  message_delay_sec: number;
  dropout_rate: number;
  active_disruptions: string[];
  is_demo: boolean;
  created_at: string;
  scenario?: Scenario;
  participants?: Participant[];
}

export interface CommunicationMessage {
  id: string;
  exercise_id: string;
  sender_name: string;
  sender_role: UserRole;
  recipient_role: string;
  original_content: string;
  delivered_content?: string;
  status: 'DELIVERED' | 'DELAYED' | 'DROPPED' | 'CORRUPTED';
  delay_seconds: number;
  sent_at: string;
}

export interface InformationReport {
  id: string;
  exercise_id: string;
  source_name: string;
  visible_to_role: string;
  title: string;
  observation: string;
  sector: string;
  confidence_level: number;
  freshness_seconds: number;
  verification_status: 'UNCONFIRMED' | 'VERIFIED' | 'CONFLICTING';
  coordinate_x: number;
  coordinate_y: number;
  timestamp: string;
}

export interface Decision {
  id: string;
  exercise_id: string;
  participant_role: UserRole;
  decision_type: string;
  action_target: string;
  rationale: string;
  confidence_score: number;
  response_time_seconds: number;
  created_at: string;
}

export interface ExerciseLogItem {
  id: string;
  exercise_id: string;
  actor_role: string;
  event_type: string;
  message: string;
  metadata?: any;
  created_at: string;
}

export interface AARReport {
  id: string;
  exercise_id: string;
  executive_summary: string;
  timeline_data: any[];
  individual_metrics: Record<string, any>;
  team_metrics: Record<string, any>;
  decision_quality_metrics: Record<string, any>;
  resilience_metrics: Record<string, any>;
  ai_analysis: Record<string, any>;
  decisions?: any[];
  exercise_metadata?: Record<string, any>;
  generated_at: string;
}
