import { buildCommands } from "./SheperdCompat"
import { Device } from "zigbee-herdsman/dist/controller/model"

export interface ZigbeeCommandProcessor {
    command(_cluster: string, _command: string, _data: any): void
}

export class ZigbeeDevice {
    constructor(public ieeeAddr: string) {}

    device: Device
    mapped: any
    processor: ZigbeeCommandProcessor

    command(object: any) {
        const commands = buildCommands(this.mapped, object)
        commands.forEach(async c => {
            if (c.cmdType !== "functional") return
            try {
                await this.device.getEndpoint(1).command(c.cid, c.cmd, c.zclData, c.cfg)
            } catch (e) {
                console.error("command", e)
            }
        })
    }

    setCommandProcessor(processor: ZigbeeCommandProcessor) {
        this.processor = processor
    }
}

let __current: ZigbeeContext | null = null

export class ZigbeeContext {
    static current(): ZigbeeContext {
        if (!__current) throw Error("zigbee not initialized")
        return __current
    }

    find(ieeeAddr: string): ZigbeeDevice {
        throw Error("not implemented")
    }
}
