"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smarthome_1 = require("smarthome");
const devices_1 = require("devices");
const ZigbeeDevice_1 = require("zigbee/ZigbeeDevice");
const Context_1 = require("activestate/Context");
jest.mock("../zigbee/ZigbeeDevice");
const deviceCommand = jest.fn(function () {
    this.lastCommand = Context_1.Context.current().time;
});
function device(ieeeAddr) {
    return {
        lastCommand: 0,
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
let home;
beforeEach(() => {
    home = new smarthome_1.SmartHome({ location: "NL", port: -1 });
});
afterEach(() => {
    home.remove();
    mockZigbeeContext.devicesByAddr = {};
});
test("space", () => {
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
    cx.advanceTimeForTesting(10);
    light.processor.receiveCommand("genOnOff", "attributeReport", { onOff: 0 });
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
test("state reports should not interfere with timers", () => {
    const light = new devices_1.Light("0x1");
    const motion = new devices_1.MotionSensor("0x2");
    smarthome_1.rule([motion], () => {
        if (motion.on) {
            light.setState("on", { forTime: 10 });
        }
    });
    motion.setState("on");
    expect(light.on).toBeTruthy();
    Context_1.Context.current().advanceTimeForTesting(1);
    expect(light.on).toBeTruthy();
    light.processor.receiveCommand("genLevelCtrl", "attributeReport", { currentLevel: 254 });
    Context_1.Context.current().advanceTimeForTesting(10);
    expect(light.on).toBeFalsy();
    Context_1.Context.current().advanceTimeForTesting(10);
    // when receiving a report, should be used
    light.processor.receiveCommand("genLevelCtrl", "attributeReport", { currentLevel: 254 });
    expect(light.on).toBeTruthy();
});
//# sourceMappingURL=smarthome.test.js.map