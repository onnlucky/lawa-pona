"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Outlet = void 0;
const Device_1 = require("./Device");
const Context_1 = require("activestate/Context");
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
            if (Context_1.Context.current().time - this.device.lastCommand < 5)
                return;
            let change = false;
            const state = {};
            if (Device_1.isNumber(data.onOff)) {
                state.on = data.onOff === 1;
                if (this.state.on !== state.on) {
                    change = true;
                }
            }
            if (change) {
                this.byDevice = true;
                this.state.updateState(state);
            }
        }
    }
}
//# sourceMappingURL=Outlet.js.map