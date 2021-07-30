import { TimerObject, Context } from "./Context"
import { ActiveState } from "./ActiveState"

export class Link implements TimerObject {
    lastRun = -1
    _timeout = 0

    run(_context: Context, _source: ActiveState) {}
    timeoutExpired(cx: Context): void {}
}

let __currentRule: Rule | null = null

export class Rule extends Link {
    context: Context
    constructor(public sources: ActiveState[], public body: () => void) {
        super()
        sources.forEach((source) => source._meta.links.push(this))
    }

    static current(): Rule | null {
        return __currentRule
    }

    rerunAfter(seconds: number) {
        if (__currentRule !== this) throw Error("must be current rule")
        if (seconds <= 0) return
        this.context.processLinkTimer(this, seconds)
    }

    timeoutExpired(context: Context): void {
        this.run(context)
    }

    run(context: Context) {
        if (this.lastRun === context.tick) return

        __currentRule = this
        this.context = context
        context.anyStateChanges = false
        try {
            context.log("rule [" + this.sources.map((s) => s.toString()).join(",") + "]")
            this.body()
        } finally {
            if (context.anyStateChanges) {
                this.lastRun = context.tick
            }
            __currentRule = null
        }
    }
}

export function rule(onChanges: ActiveState[], body: () => void) {
    return new Rule(onChanges, body)
}

rule.rerunAfter = (seconds: number) => {
    if (!__currentRule) throw Error("rerunAfter called outside of a rule body")
    __currentRule.rerunAfter(seconds)
}

export class Bind extends Link {
    constructor(public s1: ActiveState, public f1: string, public s2: ActiveState, public f2: string) {
        super()
        s1._meta.links.push(this)
        s2._meta.links.push(this)
    }

    run(context: Context, fromState: ActiveState) {
        if (this.lastRun === context.tick) return

        const first = fromState === this.s1
        const fromField = first ? this.f1 : this.f2
        const toState = first ? this.s2 : this.s1
        const toField = first ? this.f2 : this.f1

        const update = fromState._meta.update
        if (!update) throw Error("expect fromState to have update")
        const value = update[fromField]
        if (value === undefined) return
        context.log("bind", toState.toString(), toField, "<-", fromState.toString(), fromField, "=", value)
        toState.updateState({ [toField]: value, byUser: fromState.byUser })
        this.lastRun = context.tick
    }
}

/** Setup a two way connection between two sources. */
export function bind<T1 extends ActiveState, T2 extends ActiveState>(s1: T1, f1: keyof T1, s2: T2, f2: keyof T2): Bind {
    return new Bind(s1, f1 as string, s2, f2 as string)
}
