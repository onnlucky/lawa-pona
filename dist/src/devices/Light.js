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
    stateChanged(state, external) {
        if (!state.on) {
            this.device.sendCommand({ state: "off" });
        }
        else {
            this.device.sendCommand({ brightness: state.brightness });
        }
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
//# sourceMappingURL=Light.js.map