export interface GameEvent {
    event: string
    time: number
    timestamp: number
    relativeTo: 'start' | 'end'
    params: { [key: string]: any }
  }
  