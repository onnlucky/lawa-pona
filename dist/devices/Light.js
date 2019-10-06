"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Device_1 = require("./Device");
const Context_1 = require("activestate/Context");
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
        if (command === "status") {
            if (Device_1.isBoolean(data.online)) {
                this.state.updateState({ online: data.online });
            }
        }
        else if (command === "attributeReport") {
            // for most devices, we cannot use nor trust their initial report(s) after a command
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
            if (Device_1.isNumber(data.currentLevel)) {
                state.brightness = data.currentLevel;
                if (!Device_1.inSameRange(this.state.brightness, data.currentLevel, 2)) {
                    change = true;
                }
                if (!this.state.on && !Device_1.inSameRange(data.currentLevel, 0, 2)) {
                    state.on = true;
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
//# sourceMappingURL=Light.js.map