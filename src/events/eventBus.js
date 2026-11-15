import { EventEmitter } from "node:events";

export function createEventBus({ now = () => new Date(), logger = console } = {}) {
    const emitter = new EventEmitter();
    const pending = new Set();

    return {
        publish(name, payload) {
            emitter.emit(name, { name, occurredAt: now().toISOString(), payload });
        },

        subscribe(name, handler) {
            // emit() wywołuje listenery synchronicznie. Handler startuje dopiero w kolejnym mikrozadaniu,
            // więc publish() wraca od razu, a błąd handlera (rzucony albo z odrzuconego Promise)
            // jest łapany tutaj i nie dociera do service ani do odpowiedzi HTTP.
            emitter.on(name, event => {
                const run = Promise.resolve()
                    .then(() => handler(event))
                    .catch(err => logger.error(`[event:${name}] handler failed`, err))
                    .finally(() => pending.delete(run));
                pending.add(run);
            });
        },

        // Czeka na handlery, które już wystartowały - przed zamknięciem puli połączeń i w testach.
        async drain() {
            while (pending.size > 0) await Promise.allSettled([...pending]);
        }
    };
}

export const noopEventBus = Object.freeze({
    publish() {},
    subscribe() {},
    async drain() {}
});
