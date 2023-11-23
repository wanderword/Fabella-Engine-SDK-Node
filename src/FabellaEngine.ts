import axios from "axios";
import { GameEvent } from "./interfaces/GameEvent";
import { Display } from "./interfaces/Display";
import { AudioQuality } from "./enums/AudioQuality";
import { EngineResponse } from "./interfaces/EngineResponse";
import { EngineRequest } from "./interfaces/EngineRequest";
import { PlayerProgressListener } from "./types/PlayerStatusListener";
import { PlayerStatusListener } from "./types/PlayerProgressListener";
import { PlayerDurationListener } from "./types/PlayerDurationListener";
import { EventDispatcher } from "./utils/EventDispatcher";
import { UtteranceButton } from "./interfaces/UtteranceButton";
import { PlaybackStatus } from "./enums/PlaybackStatus";
import { JSDOM } from "jsdom";

const { window } = new JSDOM();

export class FabellaEngine {
  private engineUrl: string;
  private userId: string;
  private projectId: string;
  private versionId: string;

  onButtons: EventDispatcher<UtteranceButton[]>;
  onTextInput: EventDispatcher<GameEvent>;
  onAudio: EventDispatcher<string>;
  onDisplay: EventDispatcher<Display>;
  onVideo: EventDispatcher<GameEvent>;
  onGpsLocation: EventDispatcher<GameEvent>;
  onSessionEnd: EventDispatcher<boolean>;

  utteranceButtons: UtteranceButton[] = [];
  gameEvents: GameEvent[] = [];
  sortedGameEvents: GameEvent[] = [];

  // Keep track of time after audio is finished playing
  audioEndedDate: Date = new Date(2100, 1, 1);
  timerId: number = -1;

  audioDuration: number = -1;

  lastEvent: number = -1;

  constructor(
    engineUrl: string,
    userId: string,
    projectId: string,
    versionId: string,
    _initCallbacks: (
      onProgress: PlayerProgressListener,
      onStatus: PlayerStatusListener,
      onDuration: PlayerDurationListener
    ) => void
  ) {
    this.onButtons = new EventDispatcher<UtteranceButton[]>();
    this.onTextInput = new EventDispatcher<GameEvent>();
    this.onAudio = new EventDispatcher<string>();
    this.onDisplay = new EventDispatcher<Display>();
    this.onVideo = new EventDispatcher<GameEvent>();
    this.onGpsLocation = new EventDispatcher<GameEvent>();
    this.onSessionEnd = new EventDispatcher<boolean>();

    this.engineUrl = engineUrl;
    this.userId = userId;

    this.projectId = projectId;
    this.versionId = versionId;
    _initCallbacks(this.onProgress, this.onStatus, this.onDuration);
  }

  onProgress = (ms: number) => {
    this.checkEvents(ms);
  };

  onDuration = (duration: number) => {
    this.audioDuration = duration;
    this.sortedGameEvents = [];
    this.gameEvents.forEach((gameEvent: any) => {
      const modifiedEvent = gameEvent;
      modifiedEvent.timestamp = modifiedEvent.time;
      if (gameEvent.relativeTo === "end") {
        modifiedEvent.timestamp = this.audioDuration + gameEvent.time;
      }
      this.sortedGameEvents.push(modifiedEvent);
    });
    this.sortedGameEvents.sort((a, b) => a.timestamp - b.timestamp);
  };

  onStatus = (_status: PlaybackStatus) => {
    if (_status === PlaybackStatus.END) {
      this.audioEndedDate = new Date();
      this.clearTimer();

      this.timerId = window.setInterval(() => {
        const current = new Date();
        const elapsed =
          this.audioDuration +
          current.valueOf() -
          this.audioEndedDate.valueOf();
        this.checkEvents(elapsed);
      }, 500);
    } else {
      this.clearTimer();
    }
  };

  async sendInput(
    intent?: string,
    input?: string,
    audioQuality: AudioQuality = AudioQuality.MEDIUM,
    variables: Record<string, any> = {}
  ): Promise<EngineResponse> {
    const interaction: EngineRequest = {
      intent: intent ? { intent, slots: [] } : undefined,
      input: intent ? undefined : input?.toLowerCase(),
      locale: "en-US",
      projectId: this.projectId,
      versionId: this.versionId,
      audioQuality,
      variables,
      userId: this.userId,
    };

    const axiosRes = await axios.post(`${this.engineUrl}app`, interaction);

    const data = axiosRes.data as EngineResponse;
    this.gameEvents = [];
    this.utteranceButtons = [];
    this.onButtons.fire(this.utteranceButtons);

    this.onAudio.fire(data.audioUrl ?? "");

    if (data.display) {
      this.onDisplay.fire(data.display);
    }

    if (data.shouldEndSession) {
      this.onSessionEnd.fire(true);
    }

    this.gameEvents = data.gameEvents;
    this.sortedGameEvents = [];

    this.lastEvent = -1;

    return data as EngineResponse;
  }

  /**
   * Check if there are events that should be triggered
   * This function have the same logic as in the template app.
   */
  checkEvents(timestamp: number) {
    let found = true;
    let notify = false;
    for (
      let j = this.lastEvent + 1;
      j < this.sortedGameEvents.length && found;
      j++
    ) {
      if (timestamp >= this.sortedGameEvents[j].timestamp) {
        this.triggerEvent(this.sortedGameEvents[j]);
        notify = true;
        this.lastEvent = j;
      } else {
        found = false;
      }
    }
    return notify;
  }

  /**
   * Trigger event.
   */
  triggerEvent(event: GameEvent) {
    if (["UtteranceButtons", "MenuItems"].includes(event.event)) {
      this.utteranceButtons.push(...this.getButtonsFromEvent(event));
      this.onButtons.fire(this.utteranceButtons);
    } else if (event.event === "PerformAction") {
      this.sendInput(
        event.params.action?.sendIntent,
        event.params.action?.sendInput,
        event.params.action?.variables
      );
    } else if (event.event === "EndSession") {
      // Don't handle any more events
      this.gameEvents = [];
      this.clearTimer();
      this.onSessionEnd.fire(true);
    }

    if (event.event === "TextInput") {
      this.onTextInput.fire(event);
    }

    if (event.event === "GpsLocations") {
      this.onGpsLocation.fire(event);
    }

    if (event.event === "Video") {
      this.onVideo.fire(event);
    }

    // TODO handle other events here
  }

  getButtonsFromEvent(gameEvent: GameEvent): UtteranceButton[] {
    const utteranceButtons: UtteranceButton[] = [];
    if (gameEvent.event === "MenuItems") {
      for (const button of gameEvent.params.buttons) {
        let isDefault = false;
        if (
          button.action.sendIntent &&
          ["restart_intent", "stop_intent", "repeat_intent"].includes(
            button.action.sendIntent
          )
        ) {
          isDefault = true;
        }
        if (
          !button.action.sendIntent &&
          ["stop", "restart", "repeat"].includes(
            button.displayText.toLowerCase()
          )
        )
          isDefault = true;

        if (!isDefault) {
          utteranceButtons.push({
            displayText: button.displayText,
            sendInput: button.action.sendInput,
            sendIntent: button.action.sendIntent,
          });
        }
      }
    }
    if (gameEvent.event === "UtteranceButtons") {
      for (const button of gameEvent.params.buttons) {
        utteranceButtons.push({
          displayText: button.displayText,
          sendInput: button.action.sendInput,
          sendIntent: button.action.sendIntent,
        });
      }
    }
    return utteranceButtons;
  }

  private clearTimer() {
    if (this.timerId > -1) {
      window.clearInterval(this.timerId);
      this.timerId = -1;
    }
  }
}
