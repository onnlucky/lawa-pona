"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ActiveState_1 = require("../activestate/ActiveState");
const ZigbeeDevice_1 = require("zigbee/ZigbeeDevice");
const Context_1 = require("activestate/Context");
// here 3 things come together
// 1. ZigbeeDevice: the remote device as the zigbee software stack represents it
// 2. CommandProcsessor: the object that will processes incoming zigbee commands, and send commands as state changes
// 3. Device: the device represented as pure state, this is what rules are written against
class CommandProcessor {
    constructor(state) {
        this.state = state;
        state._meta.listener = this;
        this.device = ZigbeeDevice_1.ZigbeeContext.current().getDevice(state.ieeeAddr);
        this.device.setCommandProcessor(this);
    }
    receiveCommand(_cluster, _command, _data) { }
}
exports.CommandProcessor = CommandProcessor;
class Device extends ActiveState_1.ActiveState {
    constructor(ieeeAddr, name) {
        super();
        this.ieeeAddr = ieeeAddr;
        this.name = name;
    }
}
exports.Device = Device;
class OnOffDevice extends Device {
    constructor() {
        super(...arguments);
        /** Property 'on' tells if a device os turned on or off. */
        this.on = false;
    }
    get off() {
        return !this.on;
    }
    turnOn() {
        this.updateState({ on: true });
    }
    turnOff() {
        this.updateState({ on: false });
    }
    hasBeenOnFor() {
        return Context_1.Context.current().time - this.lastChange;
    }
}
exports.OnOffDevice = OnOffDevice;
//# sourceMappingURL=Device.js.map