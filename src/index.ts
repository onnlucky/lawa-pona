import {
    Controller,
    Events,
    MessageEvent,
    AnnounceEvent,
    InterviewEvent,
    JoinedEvent,
    LeaveEvent
} from "zigbee-herdsman"
const zigbeeShepherdConverters = require("zigbee-shepherd-converters")

console.log("starting")
const controller = new Controller({
    databasePath: "data.json",
    serialPort: { path: "/dev/tty.usbmodem1431" }
})
controller.start()
controller.on(Events.adapterDisconnected, (event: any) => {
    console.log("Events.adapterDisconnected", event)
})
controller.on(Events.deviceAnnounce, (event: AnnounceEvent) => {
    console.log("Events.deviceAnnounce", event.device.ieeeAddr)
})
controller.on(Events.deviceInterview, (event: InterviewEvent) => {
    console.log("Events.deviceInterview", event.device.ieeeAddr, event.device.getEndpoints().length)
    configure(event)
})
controller.on(Events.deviceJoined, (event: JoinedEvent) => {
    console.log("Events.deviceJoined", event.device.ieeeAddr)
})
controller.on(Events.deviceLeave, (event: LeaveEvent) => {
    console.log("Events.deviceLeave", event.ieeeAddr)
})
controller.on(Events.message, (event: MessageEvent) => {
    const device = event.device
    if (!device.meta.configured) {
        console.log("Events.message", event.type, event.device.ieeeAddr, event.device.getEndpoints().length)
        return
    }

    console.log(device.ieeeAddr, event.cluster, event.type, event.data)
})

function configure(event: InterviewEvent | MessageEvent) {
    const device = event.device
    if (device.meta.configured) {
        console.log("already configured...")
        return
    }
    if (!event.device.interviewCompleted) {
        console.log("still interviewing...")
        return
    }

    const mapped = zigbeeShepherdConverters.findByZigbeeModel(device.modelID)
    if (!mapped) {
        console.log("unable to configure, unknown device...")
        return
    }

    if (!mapped.configure) {
        console.log("trivial configuration...")
        device.meta.configued = true
        device.save()
        return
    }

    // compatibility
    const sheperd = {
        find(ieeeAddr: string, endpoint: number) {
            const device = controller.getDeviceByAddress(ieeeAddr)
            if (!device) return undefined
            return device.getEndpoint(endpoint)
        }
    }

    const coordinator = controller.getDevice({ type: "Coordinator" })!.getEndpoint(1)
    console.log("doing configuration...", coordinator)
    mapped.configure(device.ieeeAddr, sheperd, coordinator, (ok: any, message: any) => {
        // TODO the callback won't fire, as the commands return promises
        console.log("configured?", ok, message)
        if (!ok) {
            device.meta.configured = false
            device.save()
        }
    })
    device.meta.configured = true
    device.save()
}
