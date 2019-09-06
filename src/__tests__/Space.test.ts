import { Space } from "activestate/Space"
import { Location } from "activestate/Location"
import { ZigbeeContext, ZigbeeDevice } from "zigbee/ZigbeeDevice"
import { Light } from "devices/Light"
import { Context } from "activestate/ActiveState"

jest.mock("../zigbee/ZigbeeDevice")

const deviceCommand = jest.fn()
const backendCommand = jest.fn()

function device(ieeeAddr: string): ZigbeeDevice {
    return {
        ieeeAddr,
        device: {} as any,
        mapped: {},
        processor: {
            command: backendCommand
        },
        command: deviceCommand,
        setCommandProcessor(processor: any) {
            this.processor = processor
        }
    }
}

const Ox1111 = device("0x1111")
const Oxffff = device("0xffff")

const mockZigbeeContext = {
    find(ieeeAddr: string) {
        if (ieeeAddr === Ox1111.ieeeAddr) return Ox1111
        if (ieeeAddr === Oxffff.ieeeAddr) return Oxffff
        return device(ieeeAddr)
    }
}

ZigbeeContext.current = jest.fn(() => {
    return mockZigbeeContext
})

test("space", () => {
    new Space({ location: "NL" })

    const zigbeeContext = ZigbeeContext.current()
    expect(zigbeeContext).toBeTruthy()
    expect(zigbeeContext.find("0x1")).toBeTruthy()

    const cx = Context.current()
    expect(cx).toBeTruthy()
    // cx.debug = true

    const light = new Light("0x1111", new Location("Nowhere"))
    expect(light._listener).toBeTruthy()
    expect(light.processor.device.ieeeAddr).toBe("0x1111")
    cx.change(light, "on")
    expect(deviceCommand).toHaveBeenCalledTimes(1)
    expect(deviceCommand).toHaveBeenCalledWith({ brightness: 1 })
})
