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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zigbee_herdsman_1 = require("zigbee-herdsman");
const SheperdCompat_1 = require("./SheperdCompat");
// @ts-ignore
const zigbee_shepherd_converters_1 = __importDefault(require("zigbee-shepherd-converters"));
const log_1 = require("log");
const findUsbDevice_1 = require("findUsbDevice");
function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
function start(context, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        do {
            try {
                log_1.log("starting...");
                yield runController(context, callback);
                yield sleep(1);
            }
            catch (e) {
                callback("exception: " + e);
                yield sleep(10);
            }
        } while (true);
    });
}
exports.start = start;
function runController(context, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        const serialPort = yield findUsbDevice_1.findUsbDevice();
        const controller = new zigbee_herdsman_1.Controller({
            databasePath: "data.json",
            serialPort: { path: serialPort }
        });
        const sheperd = new SheperdCompat_1.Sheperd(controller);
        let exit;
        const exitPromise = new Promise(resolve => (exit = resolve));
        controller.on(zigbee_herdsman_1.Events.adapterDisconnected, (event) => {
            log_1.debug("Events.adapterDisconnected", event);
            exit();
        });
        controller.on(zigbee_herdsman_1.Events.deviceAnnounce, (event) => {
            try {
                log_1.debug("Events.deviceAnnounce", event.device.ieeeAddr);
            }
            catch (e) {
                log_1.debug("Events.deviceAnnounce", event);
            }
            const device = event.device;
            if (!device)
                return;
            if (!device.meta.configured) {
                if (!triedConfiguring.has(device.ieeeAddr)) {
                    triedConfiguring.add(device.ieeeAddr);
                    configureDevice(event.device);
                }
            }
        });
        controller.on(zigbee_herdsman_1.Events.deviceInterview, (event) => {
            log_1.debug("Events.deviceInterview", event.device.ieeeAddr, event.device.getEndpoints().length);
            configureDevice(event.device);
        });
        controller.on(zigbee_herdsman_1.Events.deviceJoined, (event) => {
            log_1.debug("Events.deviceJoined", event.device.ieeeAddr);
        });
        controller.on(zigbee_herdsman_1.Events.deviceLeave, (event) => {
            log_1.debug("Events.deviceLeave", event.ieeeAddr);
            triedConfiguring.delete(event.ieeeAddr);
            const device = controller.getDeviceByAddress(event.ieeeAddr);
            if (device) {
                device.removeFromDatabase();
            }
        });
        const triedConfiguring = new Set();
        controller.on(zigbee_herdsman_1.Events.message, (event) => {
            const device = event.device;
            if (!device.meta.configured) {
                log_1.debug("Events.message", event.type, event.device.ieeeAddr, event.device.getEndpoints().length);
                if (!triedConfiguring.has(device.ieeeAddr)) {
                    triedConfiguring.add(device.ieeeAddr);
                    configureDevice(event.device);
                }
                return;
            }
            const delegate = device.__delegate;
            if (delegate && delegate.processor) {
                log_1.command(device.ieeeAddr, "<--", event.cluster, event.type, event.data);
                delegate.processor.receiveCommand(event.cluster, event.type, event.data);
                return;
            }
            log_1.debug(device.ieeeAddr, event.cluster, event.type, event.data);
            if (!delegate) {
                return log_1.error("device without delegate");
            }
        });
        yield controller.start();
        controller.permitJoin(true);
        log_1.log("...started...");
        controller.getDevices({}).forEach((device) => __awaiter(this, void 0, void 0, function* () {
            if (device.type === "Coordinator")
                return;
            if (!device.interviewCompleted) {
                log_1.error("found a unconfigured device:", device.ieeeAddr, device.modelID);
                return;
            }
            if (!device.meta.configured) {
                configureDevice(device);
                return;
            }
            const mapping = getDeviceMapping(device);
            if (!mapping) {
                log_1.error("found a configured but unknown device:", device.modelID);
                log_1.debug(device);
                return;
            }
            addDevice(device, mapping);
            log_1.debug("pinging:", device.ieeeAddr);
            try {
                log_1.log("pinging device:", device.ieeeAddr, device.modelID);
                yield device.ping();
            }
            catch (e) {
                log_1.debug("error pinging:", device.ieeeAddr, e);
            }
        }));
        log_1.log("...all pinged");
        callback();
        function addDevice(device, mapped) {
            context.getDevice(device.ieeeAddr).setDevice(device, mapped);
        }
        function getDeviceMapping(device) {
            let model = device.modelID;
            if (model === "TRADFRI bulb E27 WS clear 806lm") {
                model = "TRADFRI bulb E27 WS clear 950lm";
            }
            return zigbee_shepherd_converters_1.default.findByZigbeeModel(model);
        }
        function configureDevice(device) {
            if (!device.interviewCompleted) {
                log_1.debug("still interviewing...");
                return;
            }
            const mapped = getDeviceMapping(device);
            if (!mapped) {
                log_1.error("configuration failed: unknown device:", device.modelID);
                log_1.debug(device);
                return;
            }
            if (device.meta.configured) {
                log_1.debug("already configured...");
                return;
            }
            if (!mapped.configure) {
                log_1.debug("trivial configuration...");
                device.meta.configured = true;
                device.save();
                log_1.log("configured device:", device.ieeeAddr, device.modelID);
                addDevice(device, mapped);
                return;
            }
            const coordinator = controller.getDevice({ type: "Coordinator" });
            const coordinatorEndpoint = new SheperdCompat_1.SheperdEndpoint(coordinator.getEndpoint(1));
            log_1.debug("doing configuration...");
            mapped.configure(device.ieeeAddr, sheperd, coordinatorEndpoint, (ok, error) => {
                if (!ok) {
                    error("configuration failed:", error);
                    device.meta.configured = false;
                    device.save();
                    return;
                }
                log_1.log("configured device:", device.ieeeAddr, device.modelID);
                addDevice(device, mapped);
            });
            device.meta.configured = true;
            device.save();
        }
        yield exitPromise;
    });
}
//# sourceMappingURL=index.js.map