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
exports.start = void 0;
const zigbee_herdsman_1 = require("zigbee-herdsman");
const SheperdCompat_1 = require("./SheperdCompat");
// @ts-ignore
const zigbee_shepherd_converters_1 = __importDefault(require("zigbee-shepherd-converters"));
const log_1 = require("log");
const findUsbDevice_1 = require("findUsbDevice");
function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
function x(device) {
    return device;
}
const defaultConfiguration = {
    minimumReportInterval: 3,
    maximumReportInterval: 300,
    reportableChange: 0,
};
const reportingClusters = {
    genOnOff: [Object.assign(Object.assign({ attribute: "onOff" }, defaultConfiguration), { minimumReportInterval: 0 })],
    genLevelCtrl: [Object.assign({ attribute: "currentLevel" }, defaultConfiguration)],
    lightingColorCtrl: [
        Object.assign({ attribute: "colorTemperature" }, defaultConfiguration),
        Object.assign({ attribute: "currentX" }, defaultConfiguration),
        Object.assign({ attribute: "currentY" }, defaultConfiguration),
    ],
    closuresWindowCovering: [
        Object.assign({ attribute: "currentPositionLiftPercentage" }, defaultConfiguration),
        Object.assign({ attribute: "currentPositionTiltPercentage" }, defaultConfiguration),
    ],
};
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
            serialPort: { path: serialPort },
        });
        let running = true;
        let exit;
        const exitPromise = new Promise((resolve) => (exit = resolve));
        controller.on(zigbee_herdsman_1.Events.adapterDisconnected, (event) => {
            var _a, _b;
            log_1.onevent("Events.adapterDisconnected", (_b = (_a = event === null || event === void 0 ? void 0 : event.device) === null || _a === void 0 ? void 0 : _a.ieeeAddr) !== null && _b !== void 0 ? _b : event === null || event === void 0 ? void 0 : event.ieeeAddr, event);
            running = false;
            exit();
        });
        controller.on(zigbee_herdsman_1.Events.deviceAnnounce, (event) => {
            var _a, _b;
            log_1.onevent("Events.deviceAnnounce", (_a = event === null || event === void 0 ? void 0 : event.device) === null || _a === void 0 ? void 0 : _a.ieeeAddr, (_b = event === null || event === void 0 ? void 0 : event.device) === null || _b === void 0 ? void 0 : _b.modelID);
            const device = event.device;
            if (!device)
                return;
            if (device.meta.configured)
                return;
            if (!context.hasDevice(device.ieeeAddr)) {
                log_1.log("Not configuring device because it is not defined:", device.ieeeAddr, device.modelID);
                return;
            }
            if (!triedConfiguring.has(device.ieeeAddr)) {
                triedConfiguring.add(device.ieeeAddr);
                configureDevice(device);
            }
        });
        controller.on(zigbee_herdsman_1.Events.deviceInterview, (event) => {
            const device = event.device;
            log_1.onevent("Events.deviceInterview", device.ieeeAddr, device.getEndpoints().length, device.modelID);
            configureDevice(device);
        });
        controller.on(zigbee_herdsman_1.Events.deviceJoined, (event) => {
            log_1.onevent("Events.deviceJoined", event.device.ieeeAddr, event.device.modelID);
        });
        controller.on(zigbee_herdsman_1.Events.deviceLeave, (event) => {
            triedConfiguring.delete(event.ieeeAddr);
            const device = controller.getDeviceByAddress(event.ieeeAddr);
            log_1.onevent("Events.deviceLeave", event.ieeeAddr, device ? device.modelID : "unknown");
            if (device) {
                device.removeFromDatabase();
            }
        });
        const triedConfiguring = new Set();
        controller.on(zigbee_herdsman_1.Events.message, (event) => {
            const device = event.device;
            if (!device.meta.configured) {
                log_1.onevent("Events.message", event.type, device.ieeeAddr, device.getEndpoints().length, device.modelID);
                if (!triedConfiguring.has(device.ieeeAddr)) {
                    triedConfiguring.add(device.ieeeAddr);
                    configureDevice(event.device);
                }
                return;
            }
            const delegate = x(device).__delegate;
            if (delegate && delegate.processor) {
                if (event.type === "readResponse" || event.type === "attributeReport") {
                    log_1.debug(device.ieeeAddr, "<--", event.cluster, event.type, event.data, device.modelID);
                }
                else {
                    log_1.command(device.ieeeAddr, "<--", event.cluster, event.type, event.data, device.modelID);
                }
                delegate.processor.receiveCommand(event.cluster, event.type, event.data);
                return;
            }
            log_1.debug(device.ieeeAddr, event.cluster, event.type, event.data);
            if (!delegate) {
                return log_1.error("device without delegate", device.ieeeAddr, device.modelID);
            }
        });
        yield controller.start();
        controller.permitJoin(true);
        const version = yield controller.getCoordinatorVersion();
        const sheperd = new SheperdCompat_1.Sheperd(controller);
        const coordinator = controller.getDevice({ type: "Coordinator" }).getEndpoint(1);
        const sheperdCoordinator = new SheperdCompat_1.SheperdEndpoint(coordinator);
        log_1.log("...started...", version);
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            while (running) {
                yield sleep(10);
                const devices = controller.getDevices({});
                for (const device of devices) {
                    if (device.type === "Coordinator")
                        continue;
                    if (!device.interviewCompleted)
                        continue;
                    if (!device.meta.configured)
                        continue;
                    if (device["powerSource"] === "Battery")
                        continue;
                    const delegate = x(device).__delegate;
                    const processor = delegate ? delegate.processor : null;
                    if (!processor)
                        continue;
                    log_1.debug("pinging device:", device.ieeeAddr, device.modelID);
                    let online = false;
                    try {
                        yield device.ping();
                        online = true;
                    }
                    catch (e) {
                        log_1.debug("device seems offline:", device.ieeeAddr, device.modelID, e);
                    }
                    if (x(device).__online !== online) {
                        x(device).__online = online;
                        log_1.command(device.ieeeAddr, "<--", "status", "status", { online }, device.modelID);
                        processor.receiveCommand("status", "status", { online });
                    }
                }
            }
        }));
        const promises = controller.getDevices({}).map((device) => {
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
                log_1.error("found a configured but unknown device:", device.ieeeAddr, device.modelID);
                log_1.debug(device);
                return;
            }
            return addDevice(device, mapping);
        });
        yield Promise.all(promises);
        log_1.log("...all pinged");
        callback();
        function readReportOrPing(device) {
            return __awaiter(this, void 0, void 0, function* () {
                const delegate = device.__delegate;
                const processor = delegate ? delegate.processor : null;
                let setupReport = false;
                try {
                    device.getEndpoints().forEach((endpoint) => __awaiter(this, void 0, void 0, function* () {
                        Object.entries(reportingClusters).forEach(([cluster, config]) => __awaiter(this, void 0, void 0, function* () {
                            if (!endpoint.supportsInputCluster(cluster))
                                return;
                            setupReport = true;
                            // seems to get confused if we setup reportings
                            if (device.modelID === "ZG9101SAC-HP")
                                return;
                            if (processor) {
                                log_1.debug("requesting current status:", device.ieeeAddr, device.modelID, cluster);
                                const result = yield endpoint.read(cluster, config.map((c) => c.attribute));
                                log_1.debug(device.ieeeAddr, "<--", cluster, "attributeReport", result, device.modelID);
                                processor.receiveCommand(cluster, "attributeReport", result);
                            }
                            log_1.debug("setting up reporting:", device.ieeeAddr, device.modelID, cluster);
                            yield endpoint.bind(cluster, coordinator);
                            yield endpoint.configureReporting(cluster, config);
                        }));
                    }));
                    if (setupReport)
                        return;
                    if (device["powerSource"] === "Battery")
                        return;
                    log_1.debug("pinging device:", device.ieeeAddr, device.modelID);
                    yield device.ping();
                }
                catch (e) {
                    log_1.error("error", setupReport ? "setting up reporting" : "pinging", device.ieeeAddr, device.modelID);
                }
            });
        }
        function addDevice(device, mapped) {
            x(device).__online = true;
            context.getDevice(device.ieeeAddr).setDevice(device, mapped);
            return readReportOrPing(device);
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
                log_1.debug(device.ieeeAddr, "still interviewing...", device.modelID);
                return;
            }
            const mapped = getDeviceMapping(device);
            if (!mapped) {
                log_1.error("configuration failed: unknown device:", device.ieeeAddr, device.modelID);
                log_1.debug(device);
                return;
            }
            if (device.meta.configured) {
                log_1.debug(device.ieeeAddr, "already configured...", device.modelID);
                return;
            }
            if (!mapped.configure) {
                log_1.debug(device.ieeeAddr, "trivial configuration...", device.modelID);
                device.meta.configured = true;
                device.save();
                log_1.log("configured device:", device.ieeeAddr, device.modelID);
                addDevice(device, mapped);
                return;
            }
            log_1.debug(device.ieeeAddr, "doing configuration...");
            try {
                mapped.configure(device.ieeeAddr, sheperd, sheperdCoordinator, (ok, error) => {
                    if (!ok) {
                        error(device.ieeeAddr, "configuration failed:", error, device.modelID);
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
            catch (e) {
                log_1.error("error mapped.configure:", e);
            }
        }
        yield exitPromise;
    });
}
//# sourceMappingURL=index.js.map