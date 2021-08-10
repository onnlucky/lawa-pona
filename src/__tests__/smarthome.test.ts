import { rule, location, units, SmartHome } from "smarthome"
import { Light, Dimmer, MotionSensor, Outlet, IkeaRemote } from "devices"

import { ZigbeeContext, ZigbeeDevice } from "zigbee/ZigbeeDevice"
import { Context } from "activestate/Context"

jest.mock("../zigbee/ZigbeeDevice")

const deviceCommand = jest.fn(function (this: ZigbeeDevice) {
    this.lastCommand = Context.current().time
})

function device(ieeeAddr: string): ZigbeeDevice {
    return {
        lastCommand: 0,
        ieeeAddr,
        device: null,
        mapped: null,
        processor: null,
        sendCommand: deviceCommand,
        setCommandProcessor(processor: any) {
            this.processor = processor
        },
        setDevice(device: any, mapped: any) {
            this.device = device
            this.mapped = mapped
        },
    }
}

const mockZigbeeContext = {
    networkOptions: {},
    devicesByAddr: {} as { [key: string]: ZigbeeDevice },
    bind() {},
    offline() {},
    getDevice(ieeeAddr: string) {
        if (this.devicesByAddr[ieeeAddr]) return this.devicesByAddr[ieeeAddr]
        return (this.devicesByAddr[ieeeAddr] = device(ieeeAddr))
    },
    hasDevice(ieeeAddr: string) {
        return !!this.devicesByAddr[ieeeAddr]
    },
}

ZigbeeContext.current = jest.fn(() => {
    return mockZigbeeContext
})

let home: SmartHome
beforeEach(() => {
    home = new SmartHome({ location: "NL", port: -1 })
})

afterEach(() => {
    home.remove()
    Context.getCurrent()?.unbind()
    mockZigbeeContext.devicesByAddr = {}
})

test("space", () => {
    const zigbeeContext = ZigbeeContext.current()
    expect(zigbeeContext).toBeTruthy()
    expect(zigbeeContext.getDevice("0x1")).toBeTruthy()

    const cx = Context.current()
    expect(cx).toBeTruthy()
    // cx.debug = true

    const light = new Light("0x1111")
    expect(light._meta.listener).toBeTruthy()
    expect(light.processor.device.ieeeAddr).toBe("0x1111")
    light.setState("on")
    expect(deviceCommand).toHaveBeenCalledTimes(1)
    expect(deviceCommand).toHaveBeenCalledWith({ brightness: 255 })

    cx.advanceTimeForTesting(10)
    light.processor.receiveCommand("genOnOff", "attributeReport", { onOff: 0 })
    expect(light.on).toBeFalsy()

    light.setState("on", { forTime: 10 })
    expect(light.on).toBeTruthy()
    expect(cx.timers).toHaveLength(1)
    cx.advanceTimeForTesting(10)
    expect(light.on).toBeFalsy()
    expect(cx.timers).toHaveLength(0)

    const motion = new MotionSensor("0x3")
    motion.setState("on")
    expect(motion.on).toBeFalsy()
    expect(cx.timers).toHaveLength(0)

    const rule1 = rule([motion], () => {
        if (motion.on) {
            light.setState("on", { forTime: 10 })
        }
    })

    expect(light.on).toBeFalsy()
    expect(rule1.lastRun).not.toBe(cx.tick)

    motion.setState("on")
    expect(rule1.lastRun).toBe(cx.tick)
    expect(motion.on).toBeFalsy()
    expect(light.on).toBeTruthy()
    expect(cx.timers).toHaveLength(1)

    cx.advanceTimeForTesting(10)
    expect(light.on).toBeFalsy()
})

test("state reports should not interfere with timers", () => {
    const light = new Light("0x1")
    light.processor.isIkea = jest.fn(() => true)
    const motion = new MotionSensor("0x2")
    rule([motion], () => {
        if (motion.on) {
            light.setState("on", { forTime: 10 })
        }
    })

    motion.setState("on")
    expect(light.on).toBeTruthy()
    Context.current().advanceTimeForTesting(1)
    expect(light.on).toBeTruthy()
    light.processor.receiveCommand("genLevelCtrl", "attributeReport", { currentLevel: 254 })
    Context.current().advanceTimeForTesting(10)
    expect(light.on).toBeFalsy()
    Context.current().advanceTimeForTesting(10)

    // when receiving a report, should be used
    light.processor.receiveCommand("genLevelCtrl", "attributeReport", { currentLevel: 254 })
    expect(light.on).toBeTruthy()
})

test.only("offline reports should not turn on lamps", () => {
    const light = new Light("0x1")
    light.processor.isIkea = jest.fn(() => true)
    expect(light.on).toBeFalsy()
    Context.current().advanceTimeForTesting(10)
    light.updateState({ brightness: 254 })
    expect(light.on).toBeTruthy()
    Context.current().advanceTimeForTesting(10)
    light.updateState({ on: false })
    expect(light.on).toBeFalsy()
    Context.current().advanceTimeForTesting(10)
    light.processor.receiveCommand("status", "status", { online: false })
    expect(light.on).toBeFalsy()
    Context.current().advanceTimeForTesting(10)
    light.processor.receiveCommand("status", "status", { online: true })
    expect(light.on).toBeFalsy()
})

test.only("offline reports should not turn on lamps", () => {
    const light = new Light("0x1")
    light.processor.isIkea = jest.fn(() => true)
    expect(light.on).toBeFalsy()
    Context.current().advanceTimeForTesting(10)
    light.updateState({ brightness: 254 })
    expect(light.on).toBeTruthy()
    Context.current().advanceTimeForTesting(10)
    light.updateState({ on: false })
    expect(light.on).toBeFalsy()
    Context.current().advanceTimeForTesting(10)
    light.processor.receiveCommand("genLevelCtrl", "attributeReport", { currentLevel: 105 })
    Context.current().advanceTimeForTesting(10)
    light.processor.receiveCommand("status", "status", { online: false })
    Context.current().advanceTimeForTesting(10)
    expect(light.on).toBeFalsy()
    light.processor.receiveCommand("status", "status", { online: true })
    Context.current().advanceTimeForTesting(10)
    expect(light.on).toBeFalsy()
})

test("location", () => {
    location("here", () => {
        const light = new Light("0x1")
        expect(light.location).toBe("here")
    })
})

test("time", () => {
    const OriginalDate = Date
    let d1 = new Date("1980-08-17T00:01:13")
    let d2 = new Date("1980-08-17T01:23:44")
    let d3 = new Date("1980-08-17T07:00:00")
    let _now = d1

    global.Date = class extends Date {
        constructor() {
            super()
            return _now
        }
    } as any

    home.updateTime()
    expect(home.hour).toBe(0)
    expect(home.minute).toBe(1)
    expect(home.latenight).toBe(false)

    _now = d2
    home.updateTime()
    expect(home.hour).toBe(1)
    expect(home.minute).toBe(23)
    expect(home.latenight).toBe(true)

    _now = d3
    home.updateTime()
    expect(home.hour).toBe(7)
    expect(home.minute).toBe(0)
    expect(home.latenight).toBe(false)

    global.Date = OriginalDate
})
