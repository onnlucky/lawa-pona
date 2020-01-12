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
class ToggleSwitch extends Device_1.Device {
    constructor() {
        super(...arguments);
        this.count = 0;
        this.button = "none";
        this.processor = new ToggleSwitchCommandProcessor(this);
    }
    postProcess(_update) {
        this.button = "none";
    }
}
exports.ToggleSwitch = ToggleSwitch;
ToggleSwitch.none = "none";
ToggleSwitch.on = "on";
ToggleSwitch.off = "off";
class ToggleSwitchCommandProcessor extends Device_1.CommandProcessor {
    constructor() {
        super(...arguments);
        this.lastTime = 0;
    }
    stateChanged(_state, _external) { }
    receiveCommand(_cluster, command, data) {
        let button = "none";
        switch (command) {
            case "commandOn":
                button = "on";
                break;
            case "commandOff":
                button = "off";
                break;
            case "commandMoveWithOnOff":
                button = data.movemode === 0 ? "on" : "off";
                break;
            default:
                return;
        }
        if (button === "on") {
            const now = Date.now() / 1000;
            const ago = now - this.lastTime;
            this.lastTime = now;
            const count = ago > 2.5 ? 1 : this.state.count + 1;
            this.state.updateState({ button, count });
        }
        else if (button === "off") {
            this.state.updateState({ button, count: 0 });
        }
    }
}
//# sourceMappingURL=Switch.js.map