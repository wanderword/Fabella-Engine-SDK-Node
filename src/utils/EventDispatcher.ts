type Handler<TEvent> = (event: TEvent) => void

export class EventDispatcher<TEvent> {
  private handlers: Handler<TEvent>[] = []

  fire(event: TEvent) {
    for (const h of this.handlers) h(event)
  }

  register(handler: Handler<TEvent>) {
    this.handlers.push(handler)
  }

  unregister(handler: Handler<TEvent>) {
    const i = this.handlers.indexOf(handler)
    if (i > -1) this.handlers.splice(i, 1)
  }

  unregisterAll() {
    this.handlers.splice(0, this.handlers.length)
  }
}
