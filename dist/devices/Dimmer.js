"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dimmer = void 0;
const Device_1 = require("./Device");
const Links_1 = require("activestate/Links");
class Dimmer extends Device_1.Device {
    constructor() {
        super(...arguments);
        this.processor = new DimmerCommandProcessor(this);
        this.level = 0;
    }
    connectTo(sink) {
        Links_1.bind(this, "level", sink, "brightness");
    }
}
exports.Dimmer = Dimmer;
class DimmerCommandProcessor extends Device_1.CommandProcessor {
    constructor() {
        super(...arguments);
        this.level = 0;
        this.lastTime = 0;
        this.lastRate = 0;
    }
    stateChanged(state, external) {
        if (external)
            return;
        this.level = state.level;
    }
    process(now) {
        if (!this.lastTime)
            return;
        const delta = now - this.lastTime;
        if (delta < 0 && delta > 2)
            return;
        const change = this.lastRate * delta;
        if ((this.level <= 0 || this.level >= 255) && Math.abs(change) < 10)
            return;
        this.level = Math.floor(this.level + change);
        if (this.level < 0)
            this.level = 0;
        if (this.level > 255)
            this.level = 255;
        const level = Math.round(this.level);
        if (level === this.state.level)
            return;
        this.state.updateState({ level });
    }
    move(rate, movemode) {
        const now = Date.now() / 1000.0;
        const dir = movemode === 0 ? 1 : -1;
        this.process(now);
        this.lastTime = now;
        this.lastRate = rate * dir;
    }
    moveTo(level) {
        this.level = level;
        this.lastTime = 0;
    }
    stop() {
        const now = Date.now() / 1000.0;
        this.process(now);
        this.lastTime = 0;
    }
    receiveCommand(_cluster, command, data) {
        if (command === "commandMove" || command === "commandMoveWithOnOff") {
            this.move(data.rate, data.movemode);
        }
        else if (command === "commandStop" || command === "commandStopWithOnOff") {
            this.stop();
        }
        else if (command === "commandMoveToLevel" || command === "commandMoveToLevelWithOnOff") {
            this.moveTo(data.level);
        }
    }
}
//# sourceMappingURL=Dimmer.js.map