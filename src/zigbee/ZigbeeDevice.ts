import { buildCommands, MappedDevice } from "./SheperdCompat"
import { Device } from "zigbee-herdsman/dist/controller/model"
import { start as startZigbeeController } from "zigbee"

import { log, command } from "log"

export interface ZigbeeCommandProcessor {
    receiveCommand(_cluster: string, _command: string, _data: any): void
}

export class ZigbeeDevice {
    constructor(public ieeeAddr: string) {}

    device: Device | null = null
    mapped: MappedDevice | null = null
    processor: ZigbeeCommandProcessor | null = null

    sendCommand(object: { [key: string]: unknown }) {
        command(this.ieeeAddr, "-->", object)
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
        ;(device as any).__delegate = this

        if (this.processor) {
            command(this.ieeeAddr, "<--", "device", "online", {})
            this.processor.receiveCommand("device", "online", {})
        }
    }
}

let __current: ZigbeeContext | null = null

export class ZigbeeContext {
    devicesByAddr: { [key: string]: ZigbeeDevice } = {}

    static current(): ZigbeeContext {
        if (!__current) throw Error("zigbee not initialized")
        return __current
    }

    offline() {
        Object.values(this.devicesByAddr).forEach(d => {
            d.device = null
            d.mapped = null
        })
    }

    bind() {
        if (__current) throw Error("cannot bind zigbee twice")

        startZigbeeController(this, error => {
            if (error) {
                log(error)
                this.offline()
                return
            }

            const known: ZigbeeDevice[] = []
            Object.values(this.devicesByAddr).forEach(d => {
                const zigbee = d.device
                const model = zigbee ? zigbee.modelID : "unknown"
                const configured = zigbee ? !!zigbee.meta.configured : "unknown"
                if (!d.processor) {
                    log("unused device:", d.ieeeAddr, "'" + model + "', configured:", configured)
                } else if (!d.device) {
                    log("defined unknown device:", d.ieeeAddr, "'" + model + "', configured:", configured)
                } else {
                    known.push(d)
                }
            })
            known.forEach(d => {
                const zigbee = d.device
                const model = zigbee ? zigbee.modelID : "unknown"
                const configured = zigbee ? !!zigbee.meta.configured : "unknown"
                log("using device:", d.ieeeAddr, "'" + model + "', configured:", configured)
            })
        })
        __current = this
    }

    getDevice(ieeeAddr: string): ZigbeeDevice {
        let device = this.devicesByAddr[ieeeAddr]
        if (device) return device
        device = new ZigbeeDevice(ieeeAddr)
        this.devicesByAddr[ieeeAddr] = device
        return device
    }
}
