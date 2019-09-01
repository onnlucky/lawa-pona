import {
    Controller,
    Events,
    MessageEvent,
    AnnounceEvent,
    InterviewEvent,
    JoinedEvent,
    LeaveEvent
} from "zigbee-herdsman"
import { Sheperd, SheperdEndpoint, buildCommands } from "./SheperdCompat"
// @ts-ignore
import zigbeeShepherdConverters from "zigbee-shepherd-converters"
import { Dimmer } from "./Dimmer"
import Debug from "debug"

const log = Debug("lawa:log")
const error = Debug("lawa:error")
const debug = Debug("lawa:debug")
Debug.enable("lawa:log,lawa:error")

log("starting...")
const controller = new Controller({
    databasePath: "data.json",
    serialPort: { path: "/dev/tty.usbmodem144101" }
})
const sheperd = new Sheperd(controller)

controller.on(Events.adapterDisconnected, (event: any) => {
    debug("Events.adapterDisconnected", event)
})
controller.on(Events.deviceAnnounce, (event: AnnounceEvent) => {
    debug("Events.deviceAnnounce", event.device.ieeeAddr)
})
controller.on(Events.deviceInterview, (event: InterviewEvent) => {
    debug("Events.deviceInterview", event.device.ieeeAddr, event.device.getEndpoints().length)
    configure(event)
})
controller.on(Events.deviceJoined, (event: JoinedEvent) => {
    debug("Events.deviceJoined", event.device.ieeeAddr)
})
controller.on(Events.deviceLeave, (event: LeaveEvent) => {
    debug("Events.deviceLeave", event.ieeeAddr)
})
;(async () => {
    await controller.start()
    log("...started...")
    controller.getDevices({}).forEach(async device => {
        if (device.type === "Coordinator") return
        if (!device.interviewCompleted) return
        debug("pinging:", device.ieeeAddr)
        try {
            await device.ping()
        } catch (e) {
            debug("error pinging:", device.ieeeAddr, e)
        }
    })
    log("...all pinged")
})()

const dimmer = new Dimmer("0x000b57fffe8f5669")

const triedConfiguring = new Set<string>()
controller.on(Events.message, (event: MessageEvent) => {
    const device = event.device
    if (!device.meta.configured) {
        debug("Events.message", event.type, event.device.ieeeAddr, event.device.getEndpoints().length)
        if (!triedConfiguring.has(device.ieeeAddr)) {
            triedConfiguring.add(device.ieeeAddr)
            configure(event)
        }
        return
    }

    debug(device.ieeeAddr, event.cluster, event.type, event.data)
    if (device.ieeeAddr === dimmer.ieeeAddr) {
        const previousLevel = dimmer.level
        dimmer.command(event.cluster, event.type, event.data)
        if (dimmer.level === previousLevel) return
        debug("new dimmer level", dimmer.level, dimmer.ieeeAddr)

        const light = controller.getDeviceByAddress("0x14b457fffe79d6bf")
        if (!light) return
        const endpoint = light.getEndpoint(1)
        if (!endpoint) return
        const mapped = zigbeeShepherdConverters.findByZigbeeModel(light.modelID)
        if (!mapped) {
            error("unknown model:", light.modelID)
            return
        }
        const commands = buildCommands(mapped, { brightness: dimmer.level })
        commands.forEach(async c => {
            if (c.cmdType !== "functional") return
            try {
                await endpoint.command(c.cid, c.cmd, c.zclData, c.cfg)
            } catch (e) {
                error("light command", e)
            }
        })
        debug("light at new dim level")
    }
})

function configure(event: InterviewEvent | MessageEvent) {
    const device = event.device
    if (device.meta.configured) {
        debug("already configured...")
        return
    }
    if (!event.device.interviewCompleted) {
        debug("still interviewing...")
        return
    }

    const mapped = zigbeeShepherdConverters.findByZigbeeModel(device.modelID)
    if (!mapped) {
        error("configuration failed: unknown device:", device.modelID)
        debug(device)
        return
    }

    if (!mapped.configure) {
        debug("trivial configuration...")
        device.meta.configured = true
        device.save()
        return
    }

    const coordinator = controller.getDevice({ type: "Coordinator" })!
    const coordinatorEndpoint = new SheperdEndpoint(coordinator.getEndpoint(1))
    debug("doing configuration...")
    mapped.configure(device.ieeeAddr, sheperd, coordinatorEndpoint, (ok: any, error: any) => {
        if (!ok) {
            error("configuration failed:", error)
            device.meta.configured = false
            device.save()
        }
    })
    device.meta.configured = true
    device.save()
}
