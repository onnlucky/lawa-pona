var __bound_context: Context | null = null

export class Context {
    tick: number
    changes: StateValue[] = []

    changed(value: StateValue) {
        this.changes.push(value)
    }

    static current(): Context {
        if (!__bound_context) throw Error("no context bound")
        return __bound_context
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

    transaction(body: Function): void {
        this.bind()
        try {
            body()
        } finally {
            this.unbind()
        }
    }
}

export enum StateType {
    Event = "Event",
    Any = "Any",
    Boolean = "Boolean",
    Integer = "Integer",
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
        case StateType.Integer:
        case StateType.Number:
            return 0
        case StateType.String:
            return ""
    }
}

class StateValue {
    current: any
    previous: any

    lastChange: number = 0
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
        if (this.lastChange === context.tick) {
            // TODO log warning
            this.current = value
            return
        }

        this.lastChange = context.tick
        this.previous = this.current
        this.current = value
        context.changed(this)
    }

    signal(context: Context, value: any) {
        if (this.type !== StateType.Event) throw Error("cannot signal a value property")
        if (this.lastChange === context.tick) return
        this.lastChange = context.tick
        this.current = value
        context.changed(this)
    }
}

export class State {
    entries: Map<string, StateValue> = new Map()

    get(name: string): any {
        const entry = this.entries.get(name)
        if (!entry) return undefined
        return entry.current
    }

    set(name: string, value: any): any {
        const context = Context.current()
        var entry = this.entries.get(name)
        if (!entry) {
            entry = new StateValue(this, typeForValue(value))
            this.entries.set(name, entry)
        }

        entry.update(context, value)
        return entry.previous
    }

    signal(name: string, value: any): void {
        const context = Context.current()
        var entry = this.entries.get(name)
        if (!entry) {
            entry = new StateValue(this, StateType.Event)
            this.entries.set(name, entry)
        }

        entry.signal(context, value)
    }
}
