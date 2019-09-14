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
    constructor() {
        super(...arguments);
        this.byDevice = false;
    }
    stateChanged(state, external) {
        if (this.byDevice) {
            this.byDevice = false;
            return;
        }
        this.device.sendCommand({ state: state.on ? "on" : "off" });
    }
    receiveCommand(_cluster, command, data) {
        if (command === "attributeReport") {
            const state = {};
            if (data.onOff !== undefined) {
                state.on = data.onOff === 1;
            }
            if (Object.keys(state).length > 0) {
                this.byDevice = true;
                this.state.updateState(state);
            }
        }
    }
}
//# sourceMappingURL=Outlet.js.map