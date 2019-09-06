import { buildCommands, MappedDevice } from "./SheperdCompat"
import { Device } from "zigbee-herdsman/dist/controller/model"
import { start } from "zigbee"

export interface ZigbeeCommandProcessor {
    command(_cluster: string, _command: string, _data: any): void
}

export class ZigbeeDevice {
    constructor(public ieeeAddr: string) {}

    device: Device | null = null
    mapped: MappedDevice | null = null
    processor: ZigbeeCommandProcessor | null = null

    command(object: { [key: string]: unknown }) {
        const { device, mapped } = this
        if (!device || !mapped) return
        const endpoint = device.getEndpoint(1)
        const commands = buildCommands(mapped, object)
        commands.forEach(async c => {
            if (c.cmdType !== "functional") return
            try {
                await endpoint.command(c.cid, c.cmd, c.zclData, c.cfg)
            } catch (e) {
                console.error("command", e)
            }
        })
    }

    setCommandProcessor(processor: ZigbeeCommandProcessor) {
        this.processor = processor
    }

    setDevice(device: Device, mapped: MappedDevice) {
        this.device = device
        this.mapped = mapped
    }
}

let __current: ZigbeeContext | null = null

export class ZigbeeContext {
    static current(): ZigbeeContext {
        if (!__current) throw Error("zigbee not initialized")
        return __current
    }

    bind() {
        if (__current) throw Error("cannot bind zigbee twice")
        start()
        __current = this
    }

    find(ieeeAddr: string): ZigbeeDevice {
        throw Error("not implemented")
    }
}
