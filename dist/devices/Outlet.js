"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Device_1 = require("./Device");
class Outlet extends Device_1.OnOffDevice {
    constructor() {
        super(...arguments);
        this.processor = new OutletCommandProcessor(this);
    }
}
exports.Outlet = Outlet;
class OutletCommandProcessor extends Device_1.CommandProcessor {
    stateChanged(state, external) {
        this.device.sendCommand({ state: state.on ? "on" : "off" });
    }
    receiveCommand(_cluster, command, data) {
        if (command === "genOnOff") {
            if (data.state === "on") {
                this.state.updateState({ on: true });
            }
            else {
                this.state.updateState({ on: false });
            }
        }
    }
}
//# sourceMappingURL=Outlet.js.map