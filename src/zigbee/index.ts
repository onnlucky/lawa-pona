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
import { ZigbeeDevice } from "./ZigbeeDevice"

import { error, log, debug } from "log"
import { findUsbDevice } from "findUsbDevice"

async function start() {
    log("starting...")
    const serialPort = await findUsbDevice()
    const controller = new Controller({
        databasePath: "data.json",
        serialPort: { path: serialPort }
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

        const delegate: ZigbeeDevice = (device as any).__delegate
        if (delegate) {
            delegate.processor.command(event.cluster, event.type, event.data)
            return
        }

        debug(device.ieeeAddr, event.cluster, event.type, event.data)
    })

    await controller.start()
    log("...started...")
    controller.getDevices({}).forEach(async device => {
        if (device.type === "Coordinator") return
        if (!device.interviewCompleted) return
        debug("pinging:", device.ieeeAddr)
        try {
            log("pinging device:", device.ieeeAddr, device.modelID)
            await device.ping()
        } catch (e) {
            debug("error pinging:", device.ieeeAddr, e)
        }
    })
    log("...all pinged")

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
            log("configured device:", device.ieeeAddr, device.modelID)
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
            } else {
                log("configured device:", device.ieeeAddr, device.modelID)
            }
        })
        device.meta.configured = true
        device.save()
    }
}
start()
