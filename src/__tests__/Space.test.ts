import { Space } from "activestate/Space"
import { Location } from "activestate/Location"
import { ZigbeeContext, ZigbeeDevice } from "zigbee/ZigbeeDevice"
import { Light } from "devices/Light"
import { Context, Rule } from "activestate/ActiveState"
import { MotionSensor } from "devices"

jest.mock("../zigbee/ZigbeeDevice")

const deviceCommand = jest.fn()

function device(ieeeAddr: string): ZigbeeDevice {
    return {
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
        }
    }
}

const mockZigbeeContext = {
    devicesByAddr: {} as { [key: string]: ZigbeeDevice },
    bind() {},
    getDevice(ieeeAddr: string) {
        if (this.devicesByAddr[ieeeAddr]) return this.devicesByAddr[ieeeAddr]
        return (this.devicesByAddr[ieeeAddr] = device(ieeeAddr))
    }
}

ZigbeeContext.current = jest.fn(() => {
    return mockZigbeeContext
})

test("space", () => {
    new Space({ location: "NL" })

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

    light.processor.receiveCommand("genOnOff", "genOnOff", { state: "off" })
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

    const rule = new Rule([motion], () => {
        if (motion.on) {
            light.setState("on", { forTime: 10 })
        }
    })

    expect(light.on).toBeFalsy()
    expect(rule.lastRun).not.toBe(cx.tick)

    motion.setState("on")
    expect(rule.lastRun).toBe(cx.tick)
    expect(motion.on).toBeFalsy()
    expect(light.on).toBeTruthy()
    expect(cx.timers).toHaveLength(1)

    cx.advanceTimeForTesting(10)
    expect(light.on).toBeFalsy()
})
