"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smarthome_1 = require("smarthome");
const devices_1 = require("devices");
const ZigbeeDevice_1 = require("zigbee/ZigbeeDevice");
const Context_1 = require("activestate/Context");
jest.mock("../zigbee/ZigbeeDevice");
const deviceCommand = jest.fn();
function device(ieeeAddr) {
    return {
        ieeeAddr,
        device: null,
        mapped: null,
        processor: null,
        sendCommand: deviceCommand,
        setCommandProcessor(processor) {
            this.processor = processor;
        },
        setDevice(device, mapped) {
            this.device = device;
            this.mapped = mapped;
        }
    };
}
const mockZigbeeContext = {
    devicesByAddr: {},
    bind() { },
    offline() { },
    getDevice(ieeeAddr) {
        if (this.devicesByAddr[ieeeAddr])
            return this.devicesByAddr[ieeeAddr];
        return (this.devicesByAddr[ieeeAddr] = device(ieeeAddr));
    }
};
ZigbeeDevice_1.ZigbeeContext.current = jest.fn(() => {
    return mockZigbeeContext;
});
test("space", () => {
    const home = new smarthome_1.SmartHome({ location: "NL" });
    const zigbeeContext = ZigbeeDevice_1.ZigbeeContext.current();
    expect(zigbeeContext).toBeTruthy();
    expect(zigbeeContext.getDevice("0x1")).toBeTruthy();
    const cx = Context_1.Context.current();
    expect(cx).toBeTruthy();
    // cx.debug = true
    const light = new devices_1.Light("0x1111");
    expect(light._meta.listener).toBeTruthy();
    expect(light.processor.device.ieeeAddr).toBe("0x1111");
    light.setState("on");
    expect(deviceCommand).toHaveBeenCalledTimes(1);
    expect(deviceCommand).toHaveBeenCalledWith({ brightness: 255 });
    light.processor.receiveCommand("genOnOff", "genOnOff", { state: "off" });
    expect(light.on).toBeFalsy();
    light.setState("on", { forTime: 10 });
    expect(light.on).toBeTruthy();
    expect(cx.timers).toHaveLength(1);
    cx.advanceTimeForTesting(10);
    expect(light.on).toBeFalsy();
    expect(cx.timers).toHaveLength(0);
    const motion = new devices_1.MotionSensor("0x3");
    motion.setState("on");
    expect(motion.on).toBeFalsy();
    expect(cx.timers).toHaveLength(0);
    const rule1 = smarthome_1.rule([motion], () => {
        if (motion.on) {
            light.setState("on", { forTime: 10 });
        }
    });
    expect(light.on).toBeFalsy();
    expect(rule1.lastRun).not.toBe(cx.tick);
    motion.setState("on");
    expect(rule1.lastRun).toBe(cx.tick);
    expect(motion.on).toBeFalsy();
    expect(light.on).toBeTruthy();
    expect(cx.timers).toHaveLength(1);
    cx.advanceTimeForTesting(10);
    expect(light.on).toBeFalsy();
});
//# sourceMappingURL=smarthome.test.js.map