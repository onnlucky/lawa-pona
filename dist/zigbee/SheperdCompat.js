"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sheperd = exports.SheperdEndpoint = exports.buildCommands = void 0;
function buildCommand(mapped, command, value, commands) {
    const converter = mapped.toZigbee.find((c) => c.key.includes(command));
    if (!converter) {
        console.log(`No converter available for '${command}' (${value})`);
        return [];
    }
    return converter.convert(command, value, commands, "set", null, {});
}
function buildCommands(mapped, commands) {
    const res = [];
    if (commands.hasOwnProperty("state")) {
        res.push(...buildCommand(mapped, "state", commands.state, commands));
    }
    if (commands.hasOwnProperty("brightness")) {
        res.push(...buildCommand(mapped, "brightness", commands.brightness, commands));
    }
    Object.entries(commands).forEach(([command, value]) => {
        if (command === "state")
            return;
        if (command === "brightness")
            return;
        res.push(...buildCommand(mapped, command, value, commands));
    });
    return res.filter(e => e);
}
exports.buildCommands = buildCommands;
function _cb(options, cb) {
    if (cb)
        return cb;
    return options;
}
function _op(options, cb) {
    if (cb)
        return options;
    if (options instanceof Function)
        return undefined;
    if (typeof options === "function")
        return undefined;
    return options;
}
function handle(cb, promise) {
    promise.then(() => cb(null)).catch(error => cb(error));
}
class SheperdEndpoint {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    get ieeeAddr() {
        return this.endpoint["deviceNetworkAddress"];
    }
    bind(clusterKey, target, cb) {
        if (target instanceof SheperdEndpoint) {
            target = target.endpoint;
        }
        handle(cb, this.endpoint.bind(clusterKey, target));
    }
    unbind(clusterKey, target, cb) {
        if (target instanceof SheperdEndpoint) {
            target = target.endpoint;
        }
        handle(cb, this.endpoint.unbind(clusterKey, target));
    }
    report(clusterKey, attribute, minimumReportInterval, maximumReportInterval, reportableChange, options, cb) {
        cb = _cb(options, cb);
        const item = { attribute, minimumReportInterval, maximumReportInterval, reportableChange };
        handle(cb, this.endpoint.configureReporting(clusterKey, [item], _op(options, cb)));
    }
    functional(clusterKey, commandKey, payload, options, cb) {
        cb = _cb(options, cb);
        handle(cb, this.endpoint.command(clusterKey, commandKey, payload, _op(options, cb)));
    }
    foundation(clusterKey, call, payload, options, cb) {
        cb = _cb(options, cb);
        options = _op(options, cb);
        if (call === "configReport") {
            const cfg = payload[0];
            const attr = { ID: cfg.attrID, type: cfg.dataType };
            this.report(clusterKey, attr, cfg.minRepIntval, cfg.maxRepIntval, cfg.repChange, options, cb);
            return;
        }
        cb(`unsupported foundation call: '${call}'`);
    }
}
exports.SheperdEndpoint = SheperdEndpoint;
class Sheperd {
    constructor(controller) {
        this.controller = controller;
    }
    find(ieeeAddr, endpointID) {
        const device = this.controller.getDeviceByAddress(ieeeAddr);
        if (!device)
            return null;
        const ep = device.getEndpoint(endpointID);
        if (!ep)
            return null;
        return new SheperdEndpoint(ep);
    }
}
exports.Sheperd = Sheperd;
//# sourceMappingURL=SheperdCompat.js.map