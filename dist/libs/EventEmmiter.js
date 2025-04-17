export class AppEvent {
    type;
    prevented;
    dispatched;
    constructor(type, detail) {
        this.type = type;
        Object.assign(this, detail);
        this.prevented = false;
        this.dispatched = false;
        for (const key in detail) {
            if (typeof detail[key] === "function" && detail[key] instanceof Function) {
                this[key] = detail[key].bind(this);
            }
        }
    }
    prevent() {
        this.prevented = true;
    }
    dispatch() {
        this.dispatched = true;
    }
}
export class EventEmmiter {
    Event = AppEvent;
    listeners = [];
    events = {};
    on(name, callback, option = {}) {
        if (!this.events[name])
            this.events[name] = [];
        this.events[name].push({
            callback: callback,
            option: option,
        });
        return () => {
            this.off(name, callback, option);
        };
    }
    off(name, callback, option) {
        if (!Array.isArray(this.events[name]))
            return;
        let listenersIdx = [];
        this.events[name].forEach((listener, idx) => {
            if (listener.callback === callback) {
                listenersIdx.push(idx);
            }
        });
        if (option) {
            listenersIdx = listenersIdx.filter((idx) => {
                const listener = this.events[name][idx];
                if (listener.option === option) {
                    return true;
                }
                return false;
            });
        }
        listenersIdx.forEach((idx) => {
            this.events[name].splice(idx, 1);
        });
    }
    emit(name, details = {}, waitAsync = false) {
        const listeners = this.events[name] || [];
        const event = new this.Event(name, details);
        const toDelete = [];
        if (waitAsync) {
            return new Promise(async (res) => {
                for (const listener of listeners) {
                    try {
                        let res = listener.callback(event);
                        if (res instanceof Promise) {
                            await res;
                        }
                    }
                    catch (e) {
                        console.error("Error on callback: ");
                        console.error(e);
                    }
                    const conf = listener.option;
                    if (conf) {
                        if (conf.once === true) {
                            toDelete.push({ name: name,
                                callback: listener.callback,
                                conf: conf
                            });
                        }
                    }
                    if (event.dispatched) {
                        break;
                    }
                }
                toDelete.forEach((listener) => {
                    this.off(listener.name, listener.callback, listener.conf);
                });
                res(event);
            });
        }
        for (const listener of listeners) {
            try {
                listener.callback(event);
            }
            catch (e) {
                console.error("Error on callback: ");
                console.error(e);
            }
            const conf = listener.option;
            if (conf) {
                if (conf.once === true) {
                    toDelete.push({ name: name,
                        callback: listener.callback,
                        conf: conf
                    });
                }
            }
            if (event.dispatched) {
                break;
            }
        }
        toDelete.forEach((listener) => {
            this.off(listener.name, listener.callback, listener.conf);
        });
        return event;
    }
}
