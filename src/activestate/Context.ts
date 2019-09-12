import { ActiveState, MetaState, ActiveStateListener } from "./ActiveState"
import { Link } from "./Links"

export interface ActiveStateChangeListener {
    onStatesChanged(state: ActiveState[]): void
}

export interface TimerObject {
    _timeout: number
    timeoutExpired(cx: Context): void
}

let __currentContext: Context | null = null

export class Context {
    running = false
    tick = 0
    time = 0
    timers: TimerObject[] = []
    scheduled: ActiveState[] = []
    debug = false
    updateTimeInterval: any = null
    anyStateChanges = false

    changeListeners: ActiveStateChangeListener[] = []
    states: ActiveState[] = []

    constructor() {
        this.setTime()
    }

    addChangeListener(o: ActiveStateChangeListener) {
        this.changeListeners.push(o)
    }

    removeChangeListener(o: ActiveStateChangeListener) {
        const at = this.changeListeners.indexOf(o)
        if (at < 0) return
        this.changeListeners.splice(at, 1)
    }

    setTime() {
        this.time = Date.now() / 1000
    }

    bind(): this {
        if (__currentContext === this) {
            return this
        }
        if (__currentContext) {
            __currentContext.unbind()
        }

        __currentContext = this
        this.updateTimeInterval = setInterval(this.updateTime, 1)
        return this
    }

    unbind() {
        if (__currentContext !== this) throw Error("assertion error: this context is not bound")
        __currentContext = null
        if (this.updateTimeInterval) {
            clearInterval(this.updateTimeInterval)
            this.updateTimeInterval = null
        }
    }

    static current() {
        if (!__currentContext) throw Error("assert error: no context is bound")
        return __currentContext
    }

    static getCurrent() {
        return __currentContext
    }

    addState(state: ActiveState) {
        if (!state.id) throw Error("state must have id")
        this.states.push(state)
    }

    getStateById(id: string) {
        return this.states.find(state => state.id === id)
    }

    log(...args: any[]) {
        if (!this.debug) return
        console.log.apply(console, args)
    }

    updated(meta: MetaState) {
        this.anyStateChanges = true
        if (meta.scheduled === this.tick) return
        meta.state.lastChange = this.time
        this.scheduled.push(meta.state)
        if (!this.running) this.run()
    }

    processMetaStateTimer(meta: MetaState, forTime: number | undefined) {
        if (forTime === undefined) {
            if (meta._timeout > 0) {
                meta._timeout = -1
            }
        } else {
            if (!meta._timeout) {
                this.timers.push(meta)
            }
            meta._timeout = this.time + forTime
        }
    }

    processLinkTimer(link: Link, forTime: number) {
        const at = this.time + forTime
        if (!link._timeout) {
            this.timers.push(link)
            link._timeout = at
        } else {
            link._timeout = Math.min(link._timeout, at)
        }
    }

    updateTime = () => {
        this.setTime()
        this.runTimers()
    }

    advanceTimeForTesting(seconds: number) {
        this.time += seconds
        this.runTimers()
    }

    runTimers() {
        const timeouts: TimerObject[] = []
        while (this.timers.length > 0) {
            const timer = this.timers[0]
            if (timer._timeout > this.time) break
            this.timers.shift()
            if (timer._timeout <= 0) continue
            timer._timeout = 0
            timeouts.push(timer)
        }
        if (timeouts.length === 0) return

        this.run(timeouts)
    }

    run(timeouts: TimerObject[] = []) {
        const start = Date.now()
        this.running = true
        this.tick += 1
        this.log("-[", this.tick, "]- run timers:", timeouts.length)
        for (let i = 0, il = timeouts.length; i < il; i++) {
            const timer = timeouts[i]
            timer.timeoutExpired(this)
        }

        this.log("-[", this.tick, "]- run changes")
        const scheduled = this.scheduled
        for (let i = 0; i < scheduled.length; i++) {
            const source = scheduled[i]
            source._meta.links.forEach(link => link.run(this, source))
        }
        this.log("-[", this.tick, "]- post processing:", scheduled.length)

        this.setTime()
        for (let i = 0, il = scheduled.length; i < il; i++) {
            const source = scheduled[i]
            const update = source._meta.update
            if (update) {
                source.lastChange = this.time
                source.forTime = 0
                this.processMetaStateTimer(source._meta, update.forTime)
                this.log("CHANGE:", source, update)
                source.postProcess(update)
            }
        }
        this.log("-[", this.tick, "]- calling listeners:", scheduled.length)
        for (let i = 0, il = scheduled.length; i < il; i++) {
            const source = scheduled[i]
            const listener = source._meta.listener
            if (!listener) continue
            listener.stateChanged(source, source.byUser)
            source.byUser = false
        }
        for (let i = 0, il = this.changeListeners.length; i < il; i++) {
            this.changeListeners[i].onStatesChanged(scheduled)
        }
        for (let i = 0, il = scheduled.length; i < il; i++) {
            scheduled[i]._meta.reset()
        }

        this.scheduled = []
        this.timers.sort((a, b) => a._timeout - b._timeout)
        this.running = false
        this.log("-[", this.tick, "]- done; millis:", Date.now() - start, "\n\n")
    }
}
