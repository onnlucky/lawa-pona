"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ActiveState_1 = require("activestate/ActiveState");
const ZigbeeDevice_1 = require("zigbee/ZigbeeDevice");
const Context_1 = require("activestate/Context");
var Links_1 = require("activestate/Links");
exports.rule = Links_1.rule;
const units = __importStar(require("./units"));
exports.units = units;
const sync_1 = require("remote/sync");
const units_1 = require("./units");
let __current = null;
class SmartHome extends ActiveState_1.ActiveState {
    constructor(options = {}) {
        super("smarthome");
        this.day = units_1.WEEKDAYS[0];
        this.hour = 0;
        this.minute = 0;
        this.latenight = false;
        this.updateTime = () => {
            const now = new Date();
            const day = units_1.WEEKDAYS[now.getDay()];
            const hour = now.getHours();
            const minute = now.getMinutes();
            const latenight = this.hour >= 1 && this.hour < 6;
            this.updateState({ day, hour, minute, latenight });
        };
        this.activeLocation = "";
        if (__current)
            throw Error("a SmartHome object was already created");
        __current = this;
        const context = new Context_1.Context().bind();
        new ZigbeeDevice_1.ZigbeeContext().bind();
        if (options.port !== undefined) {
            if (options.port > 0) {
                new sync_1.SyncServer(context).serve(options.port);
                console.log("port", options.port);
            }
        }
        else {
            try {
                new sync_1.SyncServer(context).serve(80);
                console.log("port 80");
            }
            catch (e) {
                new sync_1.SyncServer(context).serve(8080);
                console.log("port 8080");
            }
        }
        this.updateTime();
        context.addState(this);
        setInterval(this.updateTime, 5000);
    }
    static current() {
        if (!__current)
            throw Error("no SmartHome object found");
        return __current;
    }
    remove() {
        __current = null;
    }
    forEachDevice(body) { }
    forEachLight(body) { }
    beginLocation(name) {
        this.activeLocation = name;
    }
    endLocation(name) {
        this.activeLocation = name;
    }
}
exports.SmartHome = SmartHome;
function location(name, body) {
    const home = SmartHome.current();
    home.beginLocation(name);
    try {
        body();
    }
    finally {
        home.endLocation(name);
    }
}
exports.location = location;
//# sourceMappingURL=index.js.map