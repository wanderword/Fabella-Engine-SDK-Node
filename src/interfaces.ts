import { AudioQuality } from "./enums";

export interface Display {
  backgroundColor?: string;
  filters?: string[];
  subtitle?: string;
  textColor?: string;
  title?: string;
  url?: string;
}

export interface EngineRequest {
  intent?: {
    intent: string;
    slots: string[];
  };
  input?: string;
  locale?: string;
  projectId: string;
  versionId: string;
  audioQuality: AudioQuality;
  variables: object;
  userId: string;
}

export interface EngineResponse {
  audioUrl?: string;
  display?: Display;
  gameEvents: GameEvent[];
  shouldEndSession: boolean;
  utterances: string[];
  expectingRawInput: boolean;
}

export interface GameEvent {
  event: string;
  time: number;
  timestamp: number;
  relativeTo: "start" | "end";
  params: { [key: string]: any };
}

export interface UtteranceButton {
  displayText: string;
  sendInput: string;
  sendIntent: string;
}
