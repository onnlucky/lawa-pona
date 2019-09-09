"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Device_1 = require("./Device");
class MotionSensor extends Device_1.OnOffDevice {
    constructor() {
        super(...arguments);
        this.processor = new MotionSensorCommandProcessor(this);
    }
    postProcess(_update) {
        this.on = false;
    }
}
exports.MotionSensor = MotionSensor;
class MotionSensorCommandProcessor extends Device_1.CommandProcessor {
    stateChanged(_state, _external) { }
    receiveCommand(_cluster, command, _data) {
        if (command === "commandOnWithTimedOff") {
            this.state.updateState({ on: true });
        }
    }
}
//# sourceMappingURL=MotionSensor.js.map