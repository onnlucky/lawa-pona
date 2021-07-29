import { Controller } from "zigbee-herdsman"
import { Endpoint, Group } from "zigbee-herdsman/dist/controller/model"

type KeyValue = { [key: string]: any }

interface Converter {
    convert(command: string, value: unknown, commands: KeyValue, u1: any, u2: any, u3: any): any[]
}

export interface MappedDevice {
    toZigbee: Converter[]
    configure(ieeeAddr: string, sheperd: any, coordinatorEndpoint: any, cb: (ok: any, error: any) => void): void
}

function buildCommand(mapped: MappedDevice, command: string, value: unknown, commands: KeyValue) {
    const converter = mapped.toZigbee.find((c: any) => c.key.includes(command))
    if (!converter) {
        console.log(`No converter available for '${command}' (${value})`)
        return []
    }
    return converter.convert(command, value, commands, "set", null, {})
}

export function buildCommands(mapped: MappedDevice, commands: KeyValue): any[] {
    const res: any[] = []
    if (commands.hasOwnProperty("state")) {
        res.push(...buildCommand(mapped, "state", commands.state, commands))
    }
    if (commands.hasOwnProperty("brightness")) {
        res.push(...buildCommand(mapped, "brightness", commands.brightness, commands))
    }
    Object.entries(commands).forEach(([command, value]) => {
        if (command === "state") return
        if (command === "brightness") return
        res.push(...buildCommand(mapped, command, value, commands))
    })
    return res.filter((e) => e)
}

type Callback = (error: any) => void
type Options = KeyValue | Callback | undefined
type Attribute = string | number | { ID: number; type: number }

function _cb(options: Options, cb?: Callback): Callback {
    if (cb) return cb
    return options as Callback
}

function _op(options: Options, cb?: Callback): KeyValue | undefined {
    if (cb) return options
    if (options instanceof Function) return undefined
    if (typeof options === "function") return undefined
    return options
}

function handle(cb: Callback, promise: Promise<any>) {
    promise.then(() => cb(null)).catch((error) => cb(error))
}

export class SheperdEndpoint {
    constructor(public endpoint: Endpoint) {}
    get ieeeAddr(): number {
        return this.endpoint.deviceNetworkAddress
    }
    bind(clusterKey: string | number, target: Group | Endpoint | SheperdEndpoint, cb: Callback) {
        if (target instanceof SheperdEndpoint) {
            target = target.endpoint
        }
        handle(cb, this.endpoint.bind(clusterKey, target))
    }

    unbind(clusterKey: string | number, target: Group | Endpoint | SheperdEndpoint, cb: Callback) {
        if (target instanceof SheperdEndpoint) {
            target = target.endpoint
        }
        handle(cb, this.endpoint.unbind(clusterKey, target))
    }

    report(
        clusterKey: string | number,
        attribute: Attribute,
        minimumReportInterval: number,
        maximumReportInterval: number,
        reportableChange: number,
        options: Options,
        cb: Callback
    ) {
        cb = _cb(options, cb)
        const item = { attribute, minimumReportInterval, maximumReportInterval, reportableChange }
        handle(cb, this.endpoint.configureReporting(clusterKey, [item], _op(options, cb)))
    }

    functional(
        clusterKey: string | number,
        commandKey: string | number,
        payload: KeyValue,
        options: Options,
        cb: Callback
    ) {
        cb = _cb(options, cb)
        handle(cb, this.endpoint.command(clusterKey, commandKey, payload, _op(options, cb)))
    }

    foundation(clusterKey: string | number, call: string, payload: KeyValue[], options: Options, cb: Callback) {
        cb = _cb(options, cb)
        options = _op(options, cb)
        if (call === "configReport") {
            const cfg = payload[0]
            const attr = { ID: cfg.attrID, type: cfg.dataType }
            this.report(clusterKey, attr, cfg.minRepIntval, cfg.maxRepIntval, cfg.repChange, options, cb)
            return
        }
        cb(`unsupported foundation call: '${call}'`)
    }
}

export class Sheperd {
    constructor(public controller: Controller) {}

    find(ieeeAddr: string, endpointID: number): SheperdEndpoint | null {
        const device = this.controller.getDeviceByIeeeAddr(ieeeAddr)
        if (!device) return null
        const ep = device.getEndpoint(endpointID)
        if (!ep) return null

        return new SheperdEndpoint(ep)
    }
}
