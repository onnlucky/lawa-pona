"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Device_1 = require("./Device");
class Light extends Device_1.OnOffDevice {
    constructor() {
        super(...arguments);
        this.processor = new LightCommandProcessor(this);
        this.brightness = 0;
    }
    postProcess(update) {
        const on = update.on;
        const brightness = update.brightness;
        if (on && this.brightness === 0) {
            this.brightness = 255;
        }
        else if (brightness !== undefined && brightness > 0 && on === undefined) {
            this.on = true;
        }
        if (this.brightness < 0)
            this.brightness = 0;
        if (this.brightness > 255)
            this.brightness = 255;
    }
}
exports.Light = Light;
class LightCommandProcessor extends Device_1.CommandProcessor {
    constructor() {
        super(...arguments);
        this.byDevice = false;
    }
    stateChanged(state, external) {
        if (this.byDevice) {
            this.byDevice = false;
            return;
        }
        if (!state.on) {
            this.device.sendCommand({ state: "off" });
        }
        else {
            this.device.sendCommand({ brightness: state.brightness });
        }
    }
    receiveCommand(_cluster, command, data) {
        if (command === "attributeReport") {
            const state = {};
            if (data.onOff !== undefined) {
                state.on = data.onOff === 1;
            }
            if (data.currentLevel !== undefined) {
                state.brightness = data.currentLevel;
            }
            if (Object.keys(state).length > 0) {
                this.byDevice = true;
                this.state.updateState(state);
            }
        }
    }
}
//# sourceMappingURL=Light.js.map