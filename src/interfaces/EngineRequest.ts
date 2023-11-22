import { AudioQuality } from "@/enums/AudioQuality"

export interface EngineRequest {
  intent?: {
    intent: string
    slots: string[]
  }
  input?: string
  locale?: string
  projectId: string
  versionId: string
  audioQuality: AudioQuality
  variables: object
  userId: string
}
