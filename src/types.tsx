export interface Media {
  url: string;
  caption?: string;
  copyright?: string;
  comments?: string;
}

export interface Entity {
  id: string;
  name: string;
}

export interface EntityNode {
  id: string;
  name: string;
  children: EntityNode[];
  isGroup: boolean;
  isDimmed?: boolean; // Optional property for rendering state
}

export type FeatureType = 'state' | 'numeric' | 'text';
export type ScoreType = '0' | '1' | '2' | '3' | '4' | '5'; // 0=absent, 1=common, 2=rare, 3=uncertain, 4=common&misinterpret, 5=rare&misinterpret

export interface Feature {
  id: string;
  name: string;
  type: FeatureType;
  isState: boolean;
  parentName?: string;
  base_unit?: string;
  unit_prefix?: string;
}

export interface FeatureNode {
  id: string;
  name: string;
  type: FeatureType;
  isState: boolean;
  children: FeatureNode[];
}

export interface StateScore {
  value: ScoreType;
}

export interface NumericScore {
  min: number;
  max: number;
}

export type Score = StateScore | NumericScore;

export interface Characteristic {
  text: string;
  parent: string;
  type: 'state' | 'numeric';
  score?: ScoreType;
}

export interface EntityProfile {
  name: string;
  characteristics: Characteristic[];
}

export interface KeyData {
  keyTitle: string;
  keyAuthors: string;
  keyDescription: string;
  allEntities: Map<string, Entity>;
  entityTree: EntityNode[];
  allFeatures: Map<string, Feature>;
  entityMedia: Map<string, Media[]>;
  featureMedia: Map<string, Media[]>;
  featureTree: FeatureNode[];
  entityScores: Map<string, Map<string, Score>>;
  entityProfiles: Map<string, EntityProfile>;
  totalFeaturesCount: number;
  featureListForAI: { id: string; type: FeatureType; description: string }[];
  parsingErrors: string[];
}

export interface ChosenFeature {
  value?: string | number; // value for numeric features
}

export type ModalState = 
  | { type: 'none' }
  | { type: 'entity'; entityId: string }
  | { type: 'featureImage'; featureId: string }
  | { type: 'keyInfo' }
  | { type: 'preferences' }
  | { type: 'lightbox'; media: Media[]; startIndex: number };

export interface GeminiFeatureMatch {
  id: string;
  description: string;
  value?: string;
}

export interface GeminiEntityMatch {
  id: string;
  name: string;
  score: number;
}

export interface GeminiResponse {
  updated_description: string;
  features_used: GeminiFeatureMatch[];
}

// Raw message structure for storing in state
export type AiMessageType = 'ready' | 'response' | 'error' | 'no_features';
export interface RawChatMessage {
  sender: 'user' | 'ai';
  content?: string; // For user messages
  aiType?: AiMessageType;
  data?: GeminiResponse; // For 'response' type
  errorText?: string; // for 'error' type
}

// Re-export from Icon component to make it available elsewhere
export type { IconName } from './components/Icon';