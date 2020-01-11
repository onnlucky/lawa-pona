"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Device_1 = require("./Device");
const Links_1 = require("activestate/Links");
class IkeaRemote extends Device_1.OnOffDevice {
    constructor() {
        super(...arguments);
        this.processor = new IkeaRemoteCommandProcessor(this);
        this.level = 0;
        this.button = "none";
    }
    postProcess(_update) {
        this.button = "none";
    }
    connectTo(sink) {
        Links_1.bind(this, "on", sink, "on");
        Links_1.bind(this, "level", sink, "brightness");
    }
}
exports.IkeaRemote = IkeaRemote;
IkeaRemote.none = "none";
IkeaRemote.main = "main";
IkeaRemote.dimDown = "dimDown";
IkeaRemote.dimUp = "dimUp";
IkeaRemote.cycleLeft = "cycleLeft";
IkeaRemote.cycleRight = "cycleRight";
class IkeaRemoteCommandProcessor extends Device_1.CommandProcessor {
    constructor() {
        super(...arguments);
        this.level = 0;
    }
    stateChanged(state, external) {
        if (external)
            return;
        this.level = state.level;
    }
    receiveCommand(_cluster, command, data) {
        let button = IkeaRemote.none;
        if (command === "commandToggle") {
            button = IkeaRemote.main;
            const on = !this.state.on;
            if (on && this.state.level <= 0) {
                this.state.updateState({ on, level: 255, button });
            }
            else {
                this.state.updateState({ on, button });
            }
        }
        else if (command === "commandStepWithOnOff" || command === "commandStep") {
            const button = data.stepmode === 0 ? IkeaRemote.dimUp : IkeaRemote.dimDown;
            const direction = data.stepmode === 0 ? 1 : -1;
            const delta = data.stepsize * direction;
            this.level += delta;
            if (this.level < 0)
                this.level = 0;
            if (this.level > 255)
                this.level = 255;
            if (this.level !== this.state.level) {
                const on = this.level > 0;
                this.state.updateState({ level: this.level, on, button });
            }
            else {
                this.state.updateState({ button });
            }
        }
        else if (command === "commandTradfriArrowSingle") {
            button = data.value === 257 ? IkeaRemote.cycleLeft : IkeaRemote.cycleRight;
            this.state.updateState({ button });
        }
    }
}
//# sourceMappingURL=IkeaRemote.js.map