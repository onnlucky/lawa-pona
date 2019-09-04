import { buildCommands } from "./SheperdCompat"
import { Endpoint, Device } from "zigbee-herdsman/dist/controller/model"

export interface ZigbeeDeviceDelegate {
    command(_cluster: string, _command: string, _data: any): void
}

export class ZigbeeDevice {
    get ieeeAddr() {
        return this.device.ieeeAddr
    }
    device: Device
    endpoint: Endpoint
    mapped: any
    backing: ZigbeeDeviceDelegate

    command(object: any) {
        const commands = buildCommands(this.mapped, object)
        commands.forEach(async c => {
            if (c.cmdType !== "functional") return
            try {
                await this.endpoint.command(c.cid, c.cmd, c.zclData, c.cfg)
            } catch (e) {
                console.error("command", e)
            }
        })
    }

    setDelegate(backing: ZigbeeDeviceDelegate) {
        this.backing = backing
    }
}

export class ZigbeeContext {
    static current(): ZigbeeContext {
        throw Error("not implemented")
    }

    find(ieeeAddr: string): ZigbeeDevice {
        throw Error("not implemented")
    }
}
