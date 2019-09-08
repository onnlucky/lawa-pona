// ActiveState's are objects connected by rules that might update them. This
// always happens in rounds. Per round every rule runs only once. And if multiple
// rules update the same object, only the last applied update will actually be
// applied.

interface TimerObject {
    _timeout: number
    timeoutExpired(cx: Context): void
}

export type Update = { [key: string]: any }

function makeUpdate<T extends ActiveState>(source: T, updates: (keyof T | Partial<T>)[]) {
    const update: Update = {}
    updates.forEach(u => {
        if (typeof u === "string") {
            const translated = source.translateKeyValue(u, true)
            if (translated) {
                update[translated[0]] = translated[1]
            } else {
                update[u] = true
            }
        } else if (typeof u === "object") {
            Object.assign(update, u)
        }
    })
    return update
}

let __current: Context | null = null

export class Context {
    running = false
    tick = 0
    time = 0
    timers: TimerObject[] = []
    scheduled: ActiveState[] = []
    debug = false
    updateTimeInterval: any = null
    anyStateChanges = false

    constructor() {
        this.setTime()
    }

    setTime() {
        this.time = Date.now() / 1000
    }

    bind() {
        if (__current) throw Error("assertion error: no other context should be bound")
        __current = this
        this.updateTimeInterval = setInterval(this.updateTime, 1)
    }

    unbind() {
        if (__current !== this) throw Error("assertion error: this context is not bound")
        __current = null
        if (this.updateTimeInterval) {
            clearInterval(this.updateTimeInterval)
            this.updateTimeInterval = null
        }
    }

    static current() {
        if (!__current) throw Error("assert error: no context is bound")
        return __current
    }

    log(...args: any[]) {
        if (!this.debug) return
        console.log.apply(console, args)
    }

    change<T extends ActiveState>(source: T, ...updates: (keyof T | Partial<T>)[]) {
        this.anyStateChanges = true
        const update = makeUpdate(source, updates)
        this.log("change:", source.toString(), "to:", update)
        const meta = source._meta
        meta.updateState(update)
        if (meta.scheduled === this.tick) return
        source.byUser = true
        this.scheduled.push(source)
        if (!this.running) this.run()
    }

    update(source: ActiveState, update: Update) {
        this.anyStateChanges = true
        this.log("update:", source.toString(), "to:", update)
        const meta = source._meta
        meta.updateState(update)
        if (meta.scheduled === this.tick) return
        source.byUser = false
        this.scheduled.push(source)
        if (!this.running) this.run()
    }

    updated(meta: MetaState) {
        if (meta.scheduled === this.tick) return
        this.scheduled.push(meta.state)
        if (!this.running) this.run()
    }

    processSourceTimer(meta: MetaState, forTime: number | undefined) {
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

    processWhenTimer(when: When, at: number) {
        if (!when._timeout) {
            this.timers.push(when)
            when._timeout = at
        } else {
            when._timeout = Math.min(when._timeout, at)
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
        for (let i = 0; i < this.scheduled.length; i++) {
            const source = this.scheduled[i]
            source._meta.links.forEach(link => link.run(this, source))
        }
        this.log("-[", this.tick, "]- post processing:", this.scheduled.length)

        this.setTime()
        for (let i = 0, il = this.scheduled.length; i < il; i++) {
            const source = this.scheduled[i]
            const update = source._meta.reset()
            if (update) {
                source.lastChange = this.time
                source.forTime = 0
                this.processSourceTimer(source._meta, update.forTime)
                this.log("CHANGE:", source, update)
                source.postProcess(update)
            }
        }
        this.log("-[", this.tick, "]- calling listeners:", this.scheduled.length)
        for (let i = 0, il = this.scheduled.length; i < il; i++) {
            const source = this.scheduled[i]
            const listener = source._meta.listener
            if (!listener) continue
            listener.stateChanged(source, source.byUser)
            source.byUser = false
        }
        this.timers.sort((a, b) => a._timeout - b._timeout)
        this.scheduled = []
        this.running = false
        this.log("-[", this.tick, "]- done; millis:", Date.now() - start, "\n\n")
    }
}

class Link {
    lastRun = -1
    run(_cx: Context, _source: ActiveState) {}
}

export class Rule extends Link {
    constructor(sources: ActiveState[], public body: () => void) {
        super()
        sources.forEach(source => source._meta.links.push(this))
    }

    run(cx: Context) {
        if (this.lastRun === cx.tick) return
        cx.anyStateChanges = false
        this.body()
        if (cx.anyStateChanges) {
            this.lastRun = cx.tick
        }
    }
}

class Bind extends Link {
    constructor(public s1: ActiveState, public f1: string, public s2: ActiveState, public f2: string) {
        super()
    }

    run(cx: Context, source: ActiveState) {
        if (this.lastRun === cx.tick) return

        const sourceAsData = source as any
        if (source === this.s1) {
            const value = sourceAsData[this.f1]
            if (value === undefined) return
            cx.log("bind1", this.s2.toString(), this.f2, "<-", source.toString(), this.f1, "=", value)
            cx.update(this.s2, { [this.f2]: value })
            if (source.byUser) this.s2.byUser = true
        } else if (source === this.s2) {
            const value = sourceAsData[this.f2]
            if (value === undefined) return
            cx.log("bind2", this.s1.toString(), this.f1, "<-", source.toString(), this.f2, "=", value)
            cx.update(this.s1, { [this.f1]: value })
            if (source.byUser) this.s1.byUser = true
        }
        this.lastRun = cx.tick
    }
}

/** Setup a two way connection between two sources. */
export function bind<T extends ActiveState>(source1: T, field1: keyof T) {
    return {
        to: function<S extends ActiveState>(source2: S, field2: keyof S) {
            const bind = new Bind(source1, field1 as string, source2, field2 as string)
            source1._meta.links.push(bind)
            source2._meta.links.push(bind)
        }
    }
}

class Condition {
    constructor(public source: ActiveState, public match: Update, public negate = false) {}

    evaluate(cx: Context, when: When): boolean {
        cx.log("evaluate:", this.source.toString(), this.match, this.negate ? "negated" : "")
        const source = this.source
        const sourceAsData = source as any
        for (const [key, value] of Object.entries(this.match)) {
            if (key === "forTime") continue
            const updatedValue = sourceAsData[key]
            if (updatedValue !== undefined) {
                if (updatedValue != value) return false
            } else {
                if (sourceAsData[key] != value) return false
            }
        }

        const forTime = this.match["forTime"]
        if (forTime !== undefined) {
            const at = source.lastChange + forTime
            if (at > cx.time) {
                // make sure this when rule is re-evaluated at the appropriate time
                cx.processWhenTimer(when, at)
                return false
            }
        }

        return true
    }
}

class Action {
    constructor(public source: ActiveState, public update: Update) {}

    run(cx: Context): void {
        cx.update(this.source, this.update)
    }
}

class When implements TimerObject {
    _timeout = 0
    lastRun = -1
    constructor(public conditions: Condition[], public actions: Action[]) {
        this.conditions.forEach(condition => condition.source._meta.links.push(this))
    }

    run(cx: Context) {
        if (this.lastRun === cx.tick) return

        cx.log("when:", this.conditions.length)

        for (const condition of this.conditions) {
            let result = condition.evaluate(cx, this)
            if (condition.negate) result = !result
            if (!result) return
        }

        this.lastRun = cx.tick
        for (const action of this.actions) {
            action.run(cx)
        }
    }

    timeoutExpired(cx: Context) {
        this.run(cx)
    }

    and<T extends ActiveState>(source: T, ...updates: (keyof T | Partial<T>)[]): this {
        if (this.actions.length > 0) throw Error("cannot add conditions after 'then'")
        this.conditions.push(new Condition(source, makeUpdate(source, updates)))
        source._meta.links.push(this)
        return this
    }

    andNot<T extends ActiveState>(source: T, ...updates: (keyof T | Partial<T>)[]): this {
        if (this.actions.length > 0) throw Error("cannot add conditions after 'then'")
        this.conditions.push(new Condition(source, makeUpdate(source, updates), /*negate*/ true))
        source._meta.links.push(this)
        return this
    }

    then<T extends ActiveState>(source: T, ...updates: (keyof T | Partial<T>)[]): this {
        this.actions.push(new Action(source, makeUpdate(source, updates)))
        return this
    }
}

/** Setup a conditional update. */
export function when<T extends ActiveState>(source: T, ...updates: (keyof T | Partial<T>)[]): When {
    const condition = new Condition(source, makeUpdate(source, updates))
    return new When([condition], [])
}

export interface ActiveStateListener {
    /** The method of a state listener that gets called when this state has
     * changed.
     *
     * @param state The state object that has changed
     * @param external True if the change came from the outside, false if the
     * state was changed by some rule or binding.
     */
    stateChanged(state: ActiveState, external: boolean): void
}

const blacklist: { [key: string]: boolean } = {
    prototype: true,
    _meta: true,
    updateState: true,
    previousState: true,
    lastChange: true,
    byUser: true
}

export type KeyValue = { [key: string]: any }

const __hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwnProperty(object: any, key: string) {
    return __hasOwnProperty.call(object, key)
}

export class MetaState implements TimerObject {
    context: Context
    links: Link[] = []
    listener: ActiveStateListener | null = null
    scheduled: number = -1
    _timeout = 0

    // the state object before the context started processing
    start: KeyValue | null = null
    // the last update as currently applied
    update: KeyValue | null = null

    constructor(public state: ActiveState) {}

    reset(): KeyValue | null {
        const update = this.update
        this.start = null
        this.update = null
        return update
    }

    timeoutExpired() {
        this.state.timeoutExpired()
    }

    getStart() {
        if (this.start) return this.start
        const { _meta, ...start } = this.state
        return (this.start = start)
    }

    updateState(update: KeyValue) {
        const start = this.getStart()
        Object.keys(update).forEach(key => {
            if (blacklist[key] || !hasOwnProperty(this.state, key)) {
                throw Error(`cannot update property: '${key}'`)
            }
        })
        this.update = update
        Object.assign(this.state, start, update, { _meta: this })

        if (__current) __current.updated(this)
    }
}

export class ActiveState {
    _meta = new MetaState(this)

    lastChange = 0
    byUser = false
    forTime = 0

    setState(key: keyof this, update?: Partial<this>) {
        const data: any = update ? update : {}
        const [key2, value2] = this.translateKeyValue(key as string, true)
        data[key2] = value2
        this._meta.updateState(data)
    }

    updateState(update: Partial<this>) {
        this._meta.updateState(update)
    }

    previousState() {
        return this._meta.start || this
    }

    postProcess(_update: Partial<this>) {}

    /** Called when forTime was used with an update and that time has passed.
     *
     * Default implementation tries to set "enabled" to true, or "on" to false.
     */
    timeoutExpired() {
        if (hasOwnProperty(this, "enabled")) {
            this._meta.updateState({ enabled: true })
        } else if (hasOwnProperty(this, "on")) {
            this._meta.updateState({ on: false })
        }
    }

    /** To support user multiple friendly names.
     *
     * Provide a getter so typescript knows the property exists. And provide a
     * translation from the friendly name to the primary field. Default
     * implementation translates "off" and "disabled".
     *
     * Example:
     * - "enabled" is the primary field
     * - "disabled" is the friendly name, translates to ["enabled", !value]
     */
    translateKeyValue(key: string, value: any): [string, any] {
        if (key === "off") return ["on", !value]
        if (key === "disabled") return ["enabled", !value]
        return [key, value]
    }
}
