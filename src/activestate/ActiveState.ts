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
        const update = makeUpdate(source, updates)
        this.log("change:", source.toString(), "to:", update)
        source._update = update
        if (source._scheduled === this.tick) return
        source.byUser = true
        this.scheduled.push(source)
        if (!this.running) this.run()
    }

    update(source: ActiveState, update: Update) {
        this.log("update:", source.toString(), "to:", update)
        source._update = update
        if (source._scheduled === this.tick) return
        source.byUser = false
        this.scheduled.push(source)
        if (!this.running) this.run()
    }

    processSourceTimer(source: ActiveState, forTime: number | undefined) {
        if (forTime === undefined) {
            if (source._timeout > 0) {
                source._timeout = -1
            }
        } else {
            if (!source._timeout) {
                this.timers.push(source)
            }
            source._timeout = this.time + forTime
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
            const source = this.timers[0]
            if (source._timeout > this.time) break
            this.timers.shift()
            if (source._timeout <= 0) continue
            source._timeout = 0
            timeouts.push(source)
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
            const source = timeouts[i]
            source.timeoutExpired(this)
        }
        this.log("-[", this.tick, "]- run changes")
        for (let i = 0; i < this.scheduled.length; i++) {
            const source = this.scheduled[i]
            source._links.forEach(link => link.run(this, source))
        }
        this.log("-[", this.tick, "]- post processing:", this.scheduled.length)

        this.setTime()
        for (let i = 0, il = this.scheduled.length; i < il; i++) {
            const source = this.scheduled[i]
            const update = source._update
            if (update) {
                Object.assign(source, update)
                source._update = null
                source.lastChange = this.time
                this.processSourceTimer(source, update.forTime)
                this.log("CHANGE:", source.toJSON())
                source.postProcess(update)
            }
        }
        this.log("-[", this.tick, "]- calling listeners:", this.scheduled.length)
        for (let i = 0, il = this.scheduled.length; i < il; i++) {
            const source = this.scheduled[i]
            const listener = source._listener
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

class Bind extends Link {
    constructor(public s1: ActiveState, public f1: string, public s2: ActiveState, public f2: string) {
        super()
    }

    run(cx: Context, source: ActiveState) {
        if (this.lastRun === cx.tick) return
        this.lastRun = cx.tick

        if (source === this.s1) {
            const value = source._update ? source._update[this.f1] : (source as any)[this.f1]
            cx.log("bind1", this.s2.toString(), this.f2, "<-", source.toString(), this.f1, "=", value)
            cx.update(this.s2, { [this.f2]: value })
            if (source.byUser) this.s2.byUser = true
        } else if (source === this.s2) {
            const value = source._update ? source._update[this.f2] : (source as any)[this.f2]
            cx.log("bind2", this.s1.toString(), this.f1, "<-", source.toString(), this.f2, "=", value)
            cx.update(this.s1, { [this.f1]: value })
            if (source.byUser) this.s1.byUser = true
        }
    }
}

/** Setup a two way connection between two sources. */
export function bind<T extends ActiveState>(source1: T, field1: keyof T) {
    return {
        to: function<S extends ActiveState>(source2: S, field2: keyof S) {
            const bind = new Bind(source1, field1 as string, source2, field2 as string)
            source1._links.push(bind)
            source2._links.push(bind)
        }
    }
}

class Condition {
    constructor(public source: ActiveState, public match: Update, public negate = false) {}

    evaluate(cx: Context, when: When): boolean {
        cx.log("evaluate:", this.source.toString(), this.match, this.negate ? "negated" : "")
        const source = this.source
        for (const [key, value] of Object.entries(this.match)) {
            if (key === "forTime") continue
            const updatedValue = source._update ? source._update[key] : undefined
            if (updatedValue !== undefined) {
                if (updatedValue != value) return false
            } else {
                if ((source as any)[key] != value) return false
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
        this.conditions.forEach(condition => condition.source._links.push(this))
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
        source._links.push(this)
        return this
    }

    andNot<T extends ActiveState>(source: T, ...updates: (keyof T | Partial<T>)[]): this {
        if (this.actions.length > 0) throw Error("cannot add conditions after 'then'")
        this.conditions.push(new Condition(source, makeUpdate(source, updates), /*negate*/ true))
        source._links.push(this)
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

export class ActiveState implements TimerObject {
    _context: Context
    _links: Link[] = []
    _update: Update | null = null
    _scheduled: number = -1
    _timeout = 0
    _listener: ActiveStateListener | null = null

    constructor(listener?: ActiveStateListener) {
        if (listener) {
            this._listener = listener
        }
    }

    update(...updates: (keyof this | Partial<this>)[]) {
        Context.current().update(this, makeUpdate(this, updates))
    }

    /** Property 'lastChange' tracks last update to this device. */
    lastChange = 0

    /** Property 'byUser' tracks if last change was made by user direct user
     * manipulation, and not for example by a timer or a sensor. */
    byUser = false

    /** Property 'forTime' is special and always reads as zero. */
    get forTime(): number {
        return 0
    }
    set forTime(_: number) {}

    /** Property 'enabled' decides if a device will trigger events. */
    enabled = true

    /** Property 'disabled' is the friendly name for '!enabled'. */
    get disabled(): boolean {
        return !this.enabled
    }

    toString(): string {
        return this.constructor.name
    }

    toJSON(): string {
        const res: any = {}
        Object.entries(this).forEach(([key, value]) => {
            if (key.startsWith("_")) return
            if (key === "lastChange") return
            if (key === "ieeeAddr") return
            if (typeof value === "function") return
            if (typeof value === "object") return
            res[key] = value
        })
        return JSON.stringify(res)
    }

    /** To support user multiple friendly names.
     *
     * Provide a getter so typescript knows the property exists. And provide a
     * translation from the friendly name to the primary field.
     *
     * Example:
     * - "enabled" is the primary field
     * - "disabled" is the friendly name, translates to ["enabled", !value]
     */
    translateKeyValue(key: string, value: any): [string, any] | null {
        if (key === "disabled") return ["enabled", !value]
        return null
    }

    /** Called in post processing phase if this source has had a change.
     *
     * One way this is used is for events. Devices that generate events should
     * set their state, register a change to the context, and then clear that
     * state in the post processing phase by implementing this method.
     * */
    postProcess(_update: Partial<this>) {}

    /** Called when forTime timeout has expired. Default implementation sets enabled to true. */
    timeoutExpired(cx: Context) {
        cx.update(this, { enabled: true })
    }
}
