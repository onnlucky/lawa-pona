import { Context, TimerObject } from "./Context"
import { Link, Rule } from "./Links"

// ActiveState's are objects connected by rules that might update them. This
// always happens in rounds. Per round every rule runs only once. And if multiple
// rules update the same object, only the last applied update will actually be
// applied.

export type StateDataValue = null | boolean | number | string | StateData
export type StateData = { [key: string]: StateDataValue }
export type StateUpdate = StateData & { id: string }

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
    __proto__: true,
    _meta: true,
    lastChange: true,
    setState: true,
    updateState: true,
    previousState: true
}

export type KeyValue = { [key: string]: any }

const __hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwnProperty(object: any, key: string) {
    return __hasOwnProperty.call(object, key)
}

const first = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const other = first + "0123456789"
function randomID(): string {
    return (
        first[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0]
    )
}

export class MetaState implements TimerObject {
    links: Link[] = []
    listener: ActiveStateListener | null = null
    scheduled: number = -1
    _timeout = 0

    // the state object before the context started processing
    start: KeyValue | null = null
    // the last update as currently applied
    update: KeyValue | null = null

    constructor(public state: ActiveState) {}

    reset(): void {
        this.start = null
        this.update = null
    }

    snapshot(): StateUpdate {
        const { _meta, forTime, byUser, lastChange, processor, ...data } = this.state as any
        return (data as unknown) as StateUpdate
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
        Context.current().updated(this)
    }
}

export class ActiveState {
    _meta = new MetaState(this)

    id: string
    lastChange = 0
    byUser = false
    forTime = 0

    constructor(id?: string) {
        const context = Context.getCurrent()
        if (!context) {
            this.id = id || randomID()
            return
        }

        if (id) {
            if (context.getStateById(id)) throw Error("id already exists: " + id)
        } else {
            do {
                id = randomID()
            } while (context.getStateById(id))
        }
        this.id = id
        context.addState(this)
    }

    hasBeen(key: keyof this, { forTime }: { forTime: number }): boolean {
        const rule = Rule.current()
        if (!rule) throw Error(".hasBeen() called outside or rule body")
        const [key2, value2] = this.translateKeyValue(key as string, true)
        const asData = this as any
        if (asData[key2] !== value2) return false
        const duration = rule.context.time - this.lastChange
        if (duration >= forTime) return true
        rule.rerunAfter(forTime - duration)
        return false
    }

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
