import { Controller } from "zigbee-herdsman"
import {
    DeviceAnnouncePayload,
    DeviceInterviewPayload,
    DeviceJoinedPayload,
    Events,
    MessagePayload,
} from "zigbee-herdsman/dist/controller/events"
import { DeviceLeavePayload } from "zigbee-herdsman/dist/adapter/events"
import { Device } from "zigbee-herdsman/dist/controller/model"
// @ts-ignore
import zigbeeShepherdConverters from "zigbee-shepherd-converters"

import { Sheperd, SheperdEndpoint, MappedDevice } from "./SheperdCompat"
import { ZigbeeDevice, ZigbeeContext } from "./ZigbeeDevice"
import { error, log, debug, command, onevent } from "../log"
import { findUsbDevice } from "../findUsbDevice"

process.on("unhandledRejection", (e) => {
    error("unhandledRejection", e)
})

function sleep(seconds: number) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

interface DeviceExtra extends Device {
    __online: boolean
    __delegate: ZigbeeDevice | undefined
}

function x(device: Device): DeviceExtra {
    return device as DeviceExtra
}

const defaultConfiguration = {
    minimumReportInterval: 3,
    maximumReportInterval: 300,
    reportableChange: 0,
}

const reportingClusters = {
    genOnOff: [{ attribute: "onOff", ...defaultConfiguration, minimumReportInterval: 0 }],
    genLevelCtrl: [{ attribute: "currentLevel", ...defaultConfiguration }],
    lightingColorCtrl: [
        { attribute: "colorTemperature", ...defaultConfiguration },
        { attribute: "currentX", ...defaultConfiguration },
        { attribute: "currentY", ...defaultConfiguration },
    ],
    closuresWindowCovering: [
        { attribute: "currentPositionLiftPercentage", ...defaultConfiguration },
        { attribute: "currentPositionTiltPercentage", ...defaultConfiguration },
    ],
    ssIasZone: [{ attribute: "zoneStatus", ...defaultConfiguration }],
    // genPowerCfg: [
    //     { attribute: "batteryPercentageRemaining", ...defaultConfiguration, minimumReportInterval: 60 },
    //     { attribute: "batteryVoltage", ...defaultConfiguration, minimumReportInterval: 60 },
    // ],
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

    function acceptJoiningDeviceHandler(ieeeAddr: string, networkAddress: number): boolean {
        const device = controller.getDeviceByIeeeAddr(ieeeAddr)
        console.log("acceptJoiningDeviceHandler:", ieeeAddr, networkAddress, !!device, "\n")

        if (device) {
            if (networkAddress && device.networkAddress !== networkAddress) {
                console.log("removing old device entry")
                device.removeFromDatabase()
                return true
            }
            device.endpoints.forEach((endpoint) => {
                endpoint["_binds"] = []
            })
            device["_interviewCompleted"] = false
        }
        return true
    }

    const options: any = {
        network: { ...context.networkOptions },
        databasePath: process.env.HOME + "/zigbee-data-store.json",
        adapter: { concurrent: 2, delay: 0 },
        serialPort: { path: serialPort },
        acceptJoiningDeviceHandler,
    }

    const controller = new Controller(options, console)

    const actualOnDeviceAnnounce = controller["onDeviceAnnounce"] as Function
    controller["onDeviceAnnounce"] = function (payload: any) {
        const { ieeeAddr, networkAddress } = payload
        if (ieeeAddr && networkAddress && !controller.getDeviceByIeeeAddr(ieeeAddr)) {
            // If an unknown device announces itself, it's basically a join.
            console.log("hijacked onDeviceAnnounce rerouted to onDeviceJoined", payload)
            controller["onDeviceJoined"](payload)
        } else {
            actualOnDeviceAnnounce.call(controller, payload)
        }
    }

    let running = true
    let exit: Function
    const exitPromise = new Promise((resolve) => (exit = resolve))

    controller.on(Events.adapterDisconnected, (event: any) => {
        onevent("Events.adapterDisconnected", event?.device?.ieeeAddr ?? event?.ieeeAddr, event)
        running = false
        controller.stop()
        exit()
    })

    controller.on(Events.deviceJoined, (event: DeviceJoinedPayload) => {
        onevent("Events.deviceJoined", event.device.ieeeAddr, event.device.modelID)
    })

    controller.on(Events.deviceInterview, (event: DeviceInterviewPayload) => {
        const device = event.device
        onevent("Events.deviceInterview", device.ieeeAddr, device.endpoints.length, device.modelID)
        if (event.status !== "successful") return
        configureDevice(device)
    })

    controller.on(Events.deviceAnnounce, (event: DeviceAnnouncePayload) => {
        onevent("Events.deviceAnnounce", event?.device?.ieeeAddr, event?.device?.modelID)

        const device = event.device
        if (!device) return
        if (device["meta"].configured) return

        if (!context.hasDevice(device.ieeeAddr)) {
            log("Not configuring device because it is not defined:", device.ieeeAddr, device.modelID)
            return
        }

        if (!triedConfiguring.has(device.ieeeAddr)) {
            triedConfiguring.add(device.ieeeAddr)
            configureDevice(device)
        }
    })

    controller.on(Events.deviceLeave, (event: DeviceLeavePayload) => {
        triedConfiguring.delete(event.ieeeAddr)
        const device = controller.getDeviceByIeeeAddr(event.ieeeAddr)
        onevent("Events.deviceLeave", event.ieeeAddr, device ? device.modelID : "unknown")
        if (device) {
            device.removeFromDatabase()
        }
    })

    const triedConfiguring = new Set<string>()
    controller.on(Events.message, (event: MessagePayload) => {
        const device = event.device
        if (!device["meta"].configured) {
            onevent("Events.message", event.type, device.ieeeAddr, device.endpoints.length, device.modelID)
            if (!triedConfiguring.has(device.ieeeAddr)) {
                triedConfiguring.add(device.ieeeAddr)
                configureDevice(event.device)
            }
            return
        }

        const delegate = x(device).__delegate
        if (delegate && delegate.processor) {
            if (event.type === "readResponse" || event.type === "attributeReport") {
                debug(device.ieeeAddr, "<--", event.cluster, event.type, event.data, device.modelID)
            } else {
                command(device.ieeeAddr, "<--", event.cluster, event.type, event.data, device.modelID)
            }
            delegate.processor.receiveCommand(String(event.cluster), event.type, event.data)
            return
        }
        debug(device.ieeeAddr, event.cluster, event.type, event.data)
        if (!delegate) {
            return error("device without delegate", device.ieeeAddr, device.modelID)
        }
    })

    await controller.start()
    controller.permitJoin(true)
    const version = await controller.getCoordinatorVersion()
    const sheperd = new Sheperd(controller)
    const coordinatorDevice = controller.getDevicesByType("Coordinator")[0]
    const coordinator = coordinatorDevice.getEndpoint(1)
    const sheperdCoordinator = new SheperdEndpoint(coordinator, coordinatorDevice.ieeeAddr)
    log("...started...", version)

    setTimeout(async () => {
        while (running) {
            await sleep(10)
            const devices = controller.getDevices()
            for (const device of devices) {
                if (device.type === "Coordinator") continue
                if (!device.interviewCompleted) continue
                if (!device["meta"].configured) continue
                if (device["powerSource"] === "Battery") continue

                const delegate = x(device).__delegate
                const processor = delegate ? delegate.processor : null
                if (!processor) continue

                debug("pinging device:", device.ieeeAddr, device.modelID)
                let online = false
                try {
                    await device.ping()
                    online = true
                } catch (e) {
                    debug("device seems offline:", device.ieeeAddr, device.modelID, e)
                }

                if (x(device).__online !== online) {
                    x(device).__online = online
                    command(device.ieeeAddr, "<--", "status", "status", { online }, device.modelID)
                    processor.receiveCommand("status", "status", { online })
                }
            }
        }
    })

    const promises = controller.getDevices().map((device) => {
        if (device.type === "Coordinator") return
        if (!device.interviewCompleted) {
            error("found a unconfigured device:", device.ieeeAddr, device.modelID)
            return
        }

        if (!device["meta"].configured) {
            configureDevice(device)
            return
        }

        const mapping = getDeviceMapping(device)
        if (!mapping) {
            error("found a configured but unknown device:", device.ieeeAddr, device.modelID)
            debug(device)
            return
        }

        return addDevice(device, mapping)
    })
    await Promise.all(promises)
    log("...all pinged")
    callback()

    async function readReportOrPing(device: Device) {
        if (!device.interviewCompleted) return
        const delegate: ZigbeeDevice = (device as any).__delegate
        const processor = delegate ? delegate.processor : null

        let setupReport = false
        try {
            for (const endpoint of device.endpoints) {
                for (const [cluster, config] of Object.entries(reportingClusters)) {
                    if (!endpoint.supportsInputCluster(cluster)) continue
                    setupReport = true

                    // seems to get confused if we setup reportings
                    if (device.modelID === "ZG9101SAC-HP") continue

                    if (processor) {
                        debug("requesting current status:", device.ieeeAddr, device.modelID, cluster)
                        const result = await endpoint.read(
                            cluster,
                            config.map((c) => c.attribute)
                        )
                        debug(device.ieeeAddr, "<--", cluster, "attributeReport", result, device.modelID)
                        processor.receiveCommand(cluster, "attributeReport", result)
                    }
                    debug("setting up reporting:", device.ieeeAddr, device.modelID, cluster)
                    await endpoint.bind(cluster, coordinator)
                    await endpoint.configureReporting(cluster, config)
                }
            }

            if (setupReport) return
            if (device.powerSource === "Battery") return

            debug("pinging device:", device.ieeeAddr, device.modelID)
            await device.ping()
        } catch (e) {
            error("error", setupReport ? "setting up reporting" : "pinging", device.ieeeAddr, device.modelID)
        }
    }

    function addDevice(device: Device, mapped: MappedDevice): Promise<void> {
        x(device).__online = true
        context.getDevice(device.ieeeAddr).setDevice(device, mapped)
        return readReportOrPing(device)
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
            debug(device.ieeeAddr, "still interviewing...", device.modelID)
            return
        }

        const mapped = getDeviceMapping(device)
        if (!mapped) {
            error("configuration failed: unknown device:", device.ieeeAddr, device.modelID)
            debug(device)
            return
        }

        if (device["meta"].configured) {
            debug(device.ieeeAddr, "already configured...", device.modelID)
            return
        }

        if (!mapped.configure) {
            debug(device.ieeeAddr, "trivial configuration...", device.modelID)
            device["meta"].configured = true
            device.save()
            log("configured device:", device.ieeeAddr, device.modelID)
            addDevice(device, mapped)
            return
        }

        debug(device.ieeeAddr, "doing configuration...")
        try {
            mapped.configure(device.ieeeAddr, sheperd, sheperdCoordinator, (ok: any, e: any) => {
                if (!ok) {
                    error(device.ieeeAddr, "configuration failed:", e, device.modelID)
                    device["meta"].configured = false
                    device.save()
                    return
                }

                log("configured device:", device.ieeeAddr, device.modelID)
                addDevice(device, mapped)
            })
            device["meta"].configured = true
            device.save()
        } catch (e) {
            error("error mapped.configure:", e)
        }
    }

    await exitPromise
}
