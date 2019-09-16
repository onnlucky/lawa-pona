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
let __current = null;
class SmartHome extends ActiveState_1.ActiveState {
    constructor(options = {}) {
        super();
        this.latenight = false;
        if (__current)
            throw Error("a SmartHome object was already created");
        __current = this;
        const context = new Context_1.Context().bind();
        new ZigbeeDevice_1.ZigbeeContext().bind();
        const port = options.port !== undefined ? options.port : 8080;
        if (port > 0) {
            new sync_1.SyncServer(context).serve(port);
        }
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
    beginLocation(name) { }
    endLocation(name) { }
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