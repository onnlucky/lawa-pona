import {
    Controller,
    Events,
    MessageEvent,
    AnnounceEvent,
    InterviewEvent,
    JoinedEvent,
    LeaveEvent
} from "zigbee-herdsman"
import { Sheperd, SheperdEndpoint } from "./SheperdCompat"
// @ts-ignore
import zigbeeShepherdConverters from "zigbee-shepherd-converters"

console.log("starting")
const controller = new Controller({
    databasePath: "data.json",
    serialPort: { path: "/dev/tty.usbmodem144101" }
})
const sheperd = new Sheperd(controller)

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

    const coordinator = controller.getDevice({ type: "Coordinator" })!
    const coordinatorEndpoint = new SheperdEndpoint(coordinator.getEndpoint(1))
    console.log("doing configuration...")
    mapped.configure(device.ieeeAddr, sheperd, coordinatorEndpoint, (ok: any, error: any) => {
        console.log("configured?", ok, error)
        if (!ok) {
            device.meta.configured = false
            device.save()
        }
    })
    device.meta.configured = true
    device.save()
}
