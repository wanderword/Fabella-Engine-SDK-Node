import { PlaybackStatus } from "./enums";

export type PlayerProgressListener = (ms: number) => void;
export type PlayerStatusListener = (status: PlaybackStatus) => void;
export type PlayerDurationListener = (ms: number) => void;
