var __bound_context: Context | null = null

type ScheduledRun = { rule: Function; at: number }

export class Context {
    time = 0
    changes: StateValue[] = []
    rules: Function[] = []
    scheduled: ScheduledRun[] = []

    updateTime(time: number) {
        if (time <= this.time) throw Error("cannot update time backwards")
        this.time = time

        for (let i = 0; i < 100; i++) {
            const peek = this.scheduled[0]
            if (!peek) break
            if (this.time < peek.at) break

            this.scheduled.pop()
            this.transaction(() => { })
        }
    }

    changed(value: StateValue) {
        this.changes.push(value)
    }

    register(dependency: State) {}

    static current(): Context | null {
        return __bound_context
    }

    static currentOrError(): Context {
        if (!__bound_context) throw Error("no context bound")
        return __bound_context
    }

    isBound(): boolean {
        return __bound_context === this
    }

    bind(): this {
        if (__bound_context) throw Error("context already bound")
        __bound_context = this
        return this
    }

    unbind(): this {
        if (__bound_context !== this) throw Error("context not bound")
        __bound_context = null
        return this
    }

    lastTransaction = -1
    transaction(body: Function): void {
        if (this.lastTransaction === this.time) throw Error("must advance time")
        this.lastTransaction = this.time
        this.bind()
        try {
            body()
            this.runRules()
        } finally {
            this.unbind()
        }
    }

    defineRule(body: Function): void {
        this.rules.push(body)
    }

    scheduleRule(rule: Function, at: number): void {
        let index = 0
        for (const entry of this.scheduled) {
            if (entry.at > at) break
            index += 1
        }
        this.scheduled.splice(index, 0, { rule, at })
    }

    rerunCurrentRuleAfter(after: number) {
        if (!this.currentRule) return
        this.scheduleRule(this.currentRule, this.time + after)
    }

    currentRule: Function | null = null
    runRules() {
        let processed = -1
        while (processed < this.changes.length) {
            processed = this.changes.length
            this.rules.forEach(rule => {
                this.currentRule = rule
                try {
                    rule()
                } catch (e) {
                    console.warn("error processing rule:", e)
                }
            })
        }
        this.currentRule = null
        this.changes.length = 0
    }
}

export enum StateType {
    Event = "Event",
    Any = "Any",
    Boolean = "Boolean",
    Number = "Number",
    String = "String"
}

function typeForValue(value: any): StateType {
    switch (typeof value) {
        case "number":
            return StateType.Number
        case "boolean":
            return StateType.Boolean
        case "string":
            return StateType.String
        default:
            return StateType.Any
    }
}

function defaultValueFor(type: StateType): any {
    switch (type) {
        case StateType.Event:
        case StateType.Any:
            return null
        case StateType.Boolean:
            return false
        case StateType.Number:
            return 0
        case StateType.String:
            return ""
    }
}

class StateValue {
    current: any
    previous: any

    lastChange: number = -1
    state: State
    type: StateType
    description: string

    constructor(state: State, type: StateType, description = "") {
        this.state = state
        this.type = type
        this.description = description
        this.current = this.previous = defaultValueFor(type)
    }

    update(context: Context, value: any) {
        if (this.type === StateType.Event) throw Error("cannot set a value to an event property")
        if (this.lastChange === context.time) {
            // TODO log warning
            this.current = value
            return
        }

        this.lastChange = context.time
        this.previous = this.current
        this.current = value
        context.changed(this)
    }

    signal(context: Context, value: any) {
        if (this.type !== StateType.Event) throw Error("cannot signal a value property")
        if (this.lastChange === context.time) return
        this.lastChange = context.time
        this.current = value
        context.changed(this)
    }
}

export class State {
    entries: Map<string, StateValue> = new Map()

    get(name: string): any {
        Context.current()?.register(this)
        const entry = this.entries.get(name)
        if (!entry) return undefined
        return entry.current
    }

    is(name: string, query: { value?: any; forTime?: number }): boolean {
        const context = Context.currentOrError()
        const entry = this.entries.get(name)

        if (!entry) return false
        if (query.value) {
            if (entry.current != query.value) return false
        } else {
            if (!entry.current) return false
        }

        if (query.forTime) {
            const forTime = context.time - entry.lastChange
            const timeLeft = query.forTime - forTime
            if (timeLeft <= 0) {
                return true
            } else {
                context.rerunCurrentRuleAfter(timeLeft)
                return false
            }
        }
        return true
    }

    set(name: string, value: any): any {
        const context = Context.currentOrError()
        var entry = this.entries.get(name)
        if (!entry) {
            entry = new StateValue(this, typeForValue(value))
            this.entries.set(name, entry)
        }

        entry.update(context, value)
        return entry.previous
    }

    signal(name: string, value: any = true): void {
        const context = Context.currentOrError()
        var entry = this.entries.get(name)
        if (!entry) {
            entry = new StateValue(this, StateType.Event)
            this.entries.set(name, entry)
        }

        entry.signal(context, value)
    }
}
