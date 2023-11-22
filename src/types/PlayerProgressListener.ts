import { PlaybackStatus } from "@/enums/PlaybackStatus";

export type PlayerStatusListener = (status: PlaybackStatus) => void