import { Display } from './Display'
import { GameEvent } from './GameEvent'

export interface EngineResponse {
  audioUrl?: string
  display?: Display
  gameEvents: GameEvent[]
  shouldEndSession: boolean
  utterances: string[]
  expectingRawInput: boolean
}
