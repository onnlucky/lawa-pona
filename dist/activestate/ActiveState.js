"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("./Context");
const Links_1 = require("./Links");
const blacklist = {
    prototype: true,
    __proto__: true,
    _meta: true,
    lastChange: true,
    setState: true,
    updateState: true,
    previousState: true
};
const __hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwnProperty(object, key) {
    return __hasOwnProperty.call(object, key);
}
exports.hasOwnProperty = hasOwnProperty;
const first = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const other = first + "0123456789";
function randomID() {
    return (first[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0] +
        other[(Math.random() * first.length) | 0]);
}
class MetaState {
    constructor(state) {
        this.state = state;
        this.links = [];
        this.listener = null;
        this.scheduled = -1;
        this._timeout = 0;
        // the state object before the context started processing
        this.start = null;
        // the last update as currently applied
        this.update = null;
    }
    reset() {
        this.start = null;
        this.update = null;
    }
    snapshot() {
        const _a = this.state, { _meta, forTime, byUser, lastChange, processor } = _a, data = __rest(_a, ["_meta", "forTime", "byUser", "lastChange", "processor"]);
        return data;
    }
    timeoutExpired() {
        this.state.timeoutExpired();
    }
    getStart() {
        if (this.start)
            return this.start;
        const _a = this.state, { _meta } = _a, start = __rest(_a, ["_meta"]);
        return (this.start = start);
    }
    updateState(update) {
        const start = this.getStart();
        Object.keys(update).forEach(key => {
            if (blacklist[key] || !hasOwnProperty(this.state, key)) {
                throw Error(`cannot update property: '${key}'`);
            }
        });
        this.update = update;
        Object.assign(this.state, start, update, { _meta: this });
        Context_1.Context.current().updated(this);
    }
}
exports.MetaState = MetaState;
class ActiveState {
    constructor(id) {
        this._meta = new MetaState(this);
        this.lastChange = 0;
        this.byUser = false;
        this.forTime = 0;
        const context = Context_1.Context.getCurrent();
        if (!context) {
            this.id = id || randomID();
            return;
        }
        if (id) {
            if (context.getStateById(id))
                throw Error("id already exists: " + id);
        }
        else {
            do {
                id = randomID();
            } while (context.getStateById(id));
        }
        this.id = id;
        context.addState(this);
    }
    hasBeen(key, { forTime }) {
        const rule = Links_1.Rule.current();
        if (!rule)
            throw Error(".hasBeen() called outside or rule body");
        const [key2, value2] = this.translateKeyValue(key, true);
        const asData = this;
        if (asData[key2] !== value2)
            return false;
        const duration = rule.context.time - this.lastChange;
        if (duration >= forTime)
            return true;
        rule.rerunAfter(forTime - duration);
        return false;
    }
    setState(key, update) {
        const data = update ? update : {};
        const [key2, value2] = this.translateKeyValue(key, true);
        data[key2] = value2;
        this._meta.updateState(data);
    }
    updateState(update) {
        this._meta.updateState(update);
    }
    previousState() {
        return this._meta.start || this;
    }
    postProcess(_update) { }
    /** Called when forTime was used with an update and that time has passed.
     *
     * Default implementation tries to set "enabled" to true, or "on" to false.
     */
    timeoutExpired() {
        if (hasOwnProperty(this, "enabled")) {
            this._meta.updateState({ enabled: true });
        }
        else if (hasOwnProperty(this, "on")) {
            this._meta.updateState({ on: false });
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
    translateKeyValue(key, value) {
        if (key === "off")
            return ["on", !value];
        if (key === "disabled")
            return ["enabled", !value];
        return [key, value];
    }
}
exports.ActiveState = ActiveState;
//# sourceMappingURL=ActiveState.js.map