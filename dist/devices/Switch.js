"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Device_1 = require("./Device");
const Links_1 = require("activestate/Links");
class Switch extends Device_1.OnOffDevice {
    constructor() {
        super(...arguments);
        this.processor = new SwitchCommandProcessor(this);
    }
    connectTo(sink) {
        Links_1.bind(this, "on", sink, "on");
    }
}
exports.Switch = Switch;
class SwitchCommandProcessor extends Device_1.CommandProcessor {
    stateChanged(_state, _external) { }
    receiveCommand(_cluster, command, _data) {
        if (command === "commandOn") {
            this.state.updateState({ on: true });
        }
        else if (command === "commandOff") {
            this.state.updateState({ on: false });
        }
    }
}
//# sourceMappingURL=Switch.js.map