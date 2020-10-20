"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bind = exports.Bind = exports.rule = exports.Rule = exports.Link = void 0;
class Link {
    constructor() {
        this.lastRun = -1;
        this._timeout = 0;
    }
    run(_context, _source) { }
    timeoutExpired(cx) { }
}
exports.Link = Link;
let __currentRule = null;
class Rule extends Link {
    constructor(sources, body) {
        super();
        this.sources = sources;
        this.body = body;
        sources.forEach(source => source._meta.links.push(this));
    }
    static current() {
        return __currentRule;
    }
    rerunAfter(seconds) {
        if (__currentRule !== this)
            throw Error("must be current rule");
        if (seconds <= 0)
            return;
        this.context.processLinkTimer(this, seconds);
    }
    timeoutExpired(context) {
        this.run(context);
    }
    run(context) {
        if (this.lastRun === context.tick)
            return;
        __currentRule = this;
        this.context = context;
        context.anyStateChanges = false;
        try {
            context.log("rule [" + this.sources.map(s => s.toString()).join(",") + "]");
            this.body();
        }
        finally {
            if (context.anyStateChanges) {
                this.lastRun = context.tick;
            }
            __currentRule = null;
        }
    }
}
exports.Rule = Rule;
function rule(onChanges, body) {
    return new Rule(onChanges, body);
}
exports.rule = rule;
rule.rerunAfter = (seconds) => {
    if (!__currentRule)
        throw Error("rerunAfter called outside of a rule body");
    __currentRule.rerunAfter(seconds);
};
class Bind extends Link {
    constructor(s1, f1, s2, f2) {
        super();
        this.s1 = s1;
        this.f1 = f1;
        this.s2 = s2;
        this.f2 = f2;
        s1._meta.links.push(this);
        s2._meta.links.push(this);
    }
    run(context, fromState) {
        if (this.lastRun === context.tick)
            return;
        const first = fromState === this.s1;
        const fromField = first ? this.f1 : this.f2;
        const toState = first ? this.s2 : this.s1;
        const toField = first ? this.f2 : this.f1;
        const update = fromState._meta.update;
        if (!update)
            throw Error("expect fromState to have update");
        const value = update[fromField];
        if (value === undefined)
            return;
        context.log("bind", toState.toString(), toField, "<-", fromState.toString(), fromField, "=", value);
        toState.updateState({ [toField]: value, byUser: fromState.byUser });
        this.lastRun = context.tick;
    }
}
exports.Bind = Bind;
/** Setup a two way connection between two sources. */
function bind(s1, f1, s2, f2) {
    return new Bind(s1, f1, s2, f2);
}
exports.bind = bind;
//# sourceMappingURL=Links.js.map