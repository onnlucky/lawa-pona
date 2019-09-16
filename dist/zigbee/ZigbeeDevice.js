"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const SheperdCompat_1 = require("./SheperdCompat");
const zigbee_1 = require("zigbee");
const log_1 = require("log");
const Context_1 = require("activestate/Context");
class ZigbeeDevice {
    constructor(ieeeAddr) {
        this.ieeeAddr = ieeeAddr;
        this.lastCommand = 0;
        this.device = null;
        this.mapped = null;
        this.processor = null;
    }
    sendCommand(object) {
        this.lastCommand = Context_1.Context.current().time;
        log_1.command(this.ieeeAddr, "-->", object);
        const { device, mapped } = this;
        if (!device || !mapped)
            return;
        const endpoint = device.getEndpoint(1);
        const commands = SheperdCompat_1.buildCommands(mapped, object);
        commands.forEach((c) => __awaiter(this, void 0, void 0, function* () {
            if (c.cmdType !== "functional")
                return;
            try {
                yield endpoint.command(c.cid, c.cmd, c.zclData, c.cfg);
            }
            catch (e) {
                console.error("command", e);
            }
        }));
    }
    setCommandProcessor(processor) {
        this.processor = processor;
    }
    setDevice(device, mapped) {
        this.device = device;
        this.mapped = mapped;
        device.__delegate = this;
        if (this.processor) {
            log_1.command(this.ieeeAddr, "<--", "device", "online", {}, device.modelID);
            this.processor.receiveCommand("device", "online", {});
        }
    }
}
exports.ZigbeeDevice = ZigbeeDevice;
let __current = null;
class ZigbeeContext {
    constructor() {
        this.devicesByAddr = {};
    }
    static current() {
        if (!__current)
            throw Error("zigbee not initialized");
        return __current;
    }
    offline() {
        Object.values(this.devicesByAddr).forEach(d => {
            d.device = null;
            d.mapped = null;
        });
    }
    bind() {
        if (__current)
            throw Error("cannot bind zigbee twice");
        zigbee_1.start(this, error => {
            if (error) {
                log_1.log(error);
                this.offline();
                return;
            }
            const known = [];
            Object.values(this.devicesByAddr).forEach(d => {
                const zigbee = d.device;
                const model = zigbee ? zigbee.modelID : "unknown";
                const configured = zigbee ? !!zigbee.meta.configured : "unknown";
                if (!d.processor) {
                    log_1.log("unused device:", d.ieeeAddr, "'" + model + "', configured:", configured);
                }
                else if (!d.device) {
                    log_1.log("defined unknown device:", d.ieeeAddr, "'" + model + "', configured:", configured);
                }
                else {
                    known.push(d);
                }
            });
            known.forEach(d => {
                const zigbee = d.device;
                const model = zigbee ? zigbee.modelID : "unknown";
                const configured = zigbee ? !!zigbee.meta.configured : "unknown";
                log_1.log("using device:", d.ieeeAddr, "'" + model + "', configured:", configured);
            });
        });
        __current = this;
    }
    getDevice(ieeeAddr) {
        let device = this.devicesByAddr[ieeeAddr];
        if (device)
            return device;
        device = new ZigbeeDevice(ieeeAddr);
        this.devicesByAddr[ieeeAddr] = device;
        return device;
    }
}
exports.ZigbeeContext = ZigbeeContext;
//# sourceMappingURL=ZigbeeDevice.js.map