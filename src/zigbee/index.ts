import {
    Controller,
    Events,
    MessageEvent,
    AnnounceEvent,
    InterviewEvent,
    JoinedEvent,
    LeaveEvent
} from "zigbee-herdsman"
import { Sheperd, SheperdEndpoint, MappedDevice } from "./SheperdCompat"
// @ts-ignore
import zigbeeShepherdConverters from "zigbee-shepherd-converters"
import { ZigbeeDevice, ZigbeeContext } from "./ZigbeeDevice"

import { error, log, debug, command } from "log"
import { findUsbDevice } from "findUsbDevice"
import { Device } from "zigbee-herdsman/dist/controller/model"

function sleep(seconds: number) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

export async function start(context: ZigbeeContext, callback: (error?: string) => void) {
    do {
        try {
            log("starting...")
            await runController(context, callback)
            await sleep(1)
        } catch (e) {
            callback("exception: " + e)
            await sleep(10)
        }
    } while (true)
}

async function runController(context: ZigbeeContext, callback: Function): Promise<void> {
    const serialPort = await findUsbDevice()
    const controller = new Controller({
        databasePath: "data.json",
        serialPort: { path: serialPort }
    })
    const sheperd = new Sheperd(controller)

    let exit: Function
    const exitPromise = new Promise(resolve => (exit = resolve))
    controller.on(Events.adapterDisconnected, (event: any) => {
        debug("Events.adapterDisconnected", event)
        exit()
    })

    controller.on(Events.deviceAnnounce, (event: AnnounceEvent) => {
        try {
            debug("Events.deviceAnnounce", event.device.ieeeAddr)
        } catch (e) {
            debug("Events.deviceAnnounce", event)
        }
        const device = event.device
        if (!device) return
        if (!device.meta.configured) {
            if (!triedConfiguring.has(device.ieeeAddr)) {
                triedConfiguring.add(device.ieeeAddr)
                configureDevice(event.device)
            }
        }
    })
    controller.on(Events.deviceInterview, (event: InterviewEvent) => {
        debug("Events.deviceInterview", event.device.ieeeAddr, event.device.getEndpoints().length)
        configureDevice(event.device)
    })
    controller.on(Events.deviceJoined, (event: JoinedEvent) => {
        debug("Events.deviceJoined", event.device.ieeeAddr)
    })
    controller.on(Events.deviceLeave, (event: LeaveEvent) => {
        debug("Events.deviceLeave", event.ieeeAddr)
        triedConfiguring.delete(event.ieeeAddr)
        const device = controller.getDeviceByAddress(event.ieeeAddr)
        if (device) {
            device.removeFromDatabase()
        }
    })
    const triedConfiguring = new Set<string>()
    controller.on(Events.message, (event: MessageEvent) => {
        const device = event.device
        if (!device.meta.configured) {
            debug("Events.message", event.type, event.device.ieeeAddr, event.device.getEndpoints().length)
            if (!triedConfiguring.has(device.ieeeAddr)) {
                triedConfiguring.add(device.ieeeAddr)
                configureDevice(event.device)
            }
            return
        }

        const delegate: ZigbeeDevice = (device as any).__delegate
        if (delegate && delegate.processor) {
            command(device.ieeeAddr, "<--", event.cluster, event.type, event.data)
            delegate.processor.receiveCommand(event.cluster, event.type, event.data)
            return
        }
        debug(device.ieeeAddr, event.cluster, event.type, event.data)
        if (!delegate) {
            return error("device without delegate")
        }
    })

    await controller.start()
    controller.permitJoin(true)
    log("...started...")

    controller.getDevices({}).forEach(async device => {
        if (device.type === "Coordinator") return
        if (!device.interviewCompleted) {
            error("found a unconfigured device:", device.ieeeAddr, device.modelID)
            return
        }

        if (!device.meta.configured) {
            configureDevice(device)
            return
        }

        const mapping = getDeviceMapping(device)
        if (!mapping) {
            error("found a configured but unknown device:", device.modelID)
            debug(device)
            return
        }

        addDevice(device, mapping)

        debug("pinging:", device.ieeeAddr)
        try {
            log("pinging device:", device.ieeeAddr, device.modelID)
            await device.ping()
        } catch (e) {
            debug("error pinging:", device.ieeeAddr, e)
        }
    })
    log("...all pinged")
    callback()

    function addDevice(device: Device, mapped: MappedDevice) {
        context.getDevice(device.ieeeAddr).setDevice(device, mapped)
    }

    function getDeviceMapping(device: Device): MappedDevice | undefined {
        let model = device.modelID
        if (model === "TRADFRI bulb E27 WS clear 806lm") {
            model = "TRADFRI bulb E27 WS clear 950lm"
        }
        return zigbeeShepherdConverters.findByZigbeeModel(model)
    }

    function configureDevice(device: Device) {
        if (!device.interviewCompleted) {
            debug("still interviewing...")
            return
        }

        const mapped = getDeviceMapping(device)
        if (!mapped) {
            error("configuration failed: unknown device:", device.modelID)
            debug(device)
            return
        }

        if (device.meta.configured) {
            debug("already configured...")
            return
        }

        if (!mapped.configure) {
            debug("trivial configuration...")
            device.meta.configured = true
            device.save()
            log("configured device:", device.ieeeAddr, device.modelID)
            addDevice(device, mapped)
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
                return
            }

            log("configured device:", device.ieeeAddr, device.modelID)
            addDevice(device, mapped)
        })
        device.meta.configured = true
        device.save()
    }

    await exitPromise
}
