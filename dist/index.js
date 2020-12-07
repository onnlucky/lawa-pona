"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smarthome_1 = require("smarthome");
const devices_1 = require("devices");
const home = new smarthome_1.SmartHome();
smarthome_1.rule([home], () => {
    if (!home.latenight)
        return;
    home.forEachLight((light) => {
        if (!light.on)
            return;
        const timeLeft = 30 * smarthome_1.units.MINUTES - light.hasBeenOnFor();
        if (timeLeft <= 0) {
            light.turnOff();
        }
        else {
            smarthome_1.rule.rerunAfter(timeLeft);
        }
    });
});
smarthome_1.location("Living Room", () => {
    const l1 = new devices_1.Light("0x000d6f00137466d0", "Dinner Table Light");
    new devices_1.Dimmer("0x000b57fffe8f5669", "Dimmer").connectTo(l1);
    const l2 = new devices_1.Light("0x14b457fffe79d6bf", "Living Room Light");
    const remote = new devices_1.IkeaRemote("0x000b57fffef642e1", "Ikea Remote");
    remote.connectTo(l2);
    const l3 = new devices_1.Outlet("0x000d6ffffedaaa1b", "TV Light");
    const l4 = new devices_1.Outlet("0x000d6ffffed63ea9", "Reading Light");
    const l5 = new devices_1.Outlet("0x000d6ffffeb1c9dc", "Christmas Tree");
    const l6 = new devices_1.Light("0xd0cf5efffe0830ba", "Book Case Lights");
    const lights = [l1, l2, l3, l4, l5, l6];
    smarthome_1.rule([remote], () => {
        if (remote.button === devices_1.IkeaRemote.cycleLeft) {
            l3.turnOff();
            l4.turnOff();
        }
        else if (remote.button === devices_1.IkeaRemote.cycleRight) {
            l3.turnOn();
            l4.turnOn();
        }
    });
    const s1 = new devices_1.ToggleSwitch("0x000d6ffffec5f0e4", "All Off Switch");
    const s2 = new devices_1.ToggleSwitch("0xec1bbdfffebd01d3", "All Off Switch");
    smarthome_1.rule([s1, s2], () => {
        for (const s of [s1, s2]) {
            if (s.button === devices_1.ToggleSwitch.on) {
                if (s.count > 1) {
                    for (const l of lights)
                        l.turnOn();
                }
                else {
                    for (const l of [l1, l2, l5])
                        l.turnOn();
                }
            }
            else if (s.button === devices_1.ToggleSwitch.off) {
                for (const l of lights)
                    l.turnOff();
            }
        }
    });
});
smarthome_1.location("Office", () => {
    const h1 = new devices_1.Outlet("0x000b3cfffef0a996", "Heater Office");
    smarthome_1.rule([h1], () => {
        const hour = new Date().getHours();
        if (hour > 9 && hour <= 17) {
            smarthome_1.rule.rerunAfter(10 * smarthome_1.units.MINUTES);
            return;
        }
        const timeLeft = 1.5 * smarthome_1.units.HOUR - h1.hasBeenOnFor();
        if (timeLeft <= 0) {
            h1.turnOff();
        }
        else {
            smarthome_1.rule.rerunAfter(timeLeft);
        }
    });
});
smarthome_1.location("Shed", () => {
    // const l1 = new Outlet("0x000d6ffffeb1c9dc", "Outside Light Shed")
    const l1 = new devices_1.Outlet("0x1111111111111111", "Outside Light Shed");
    const l2 = new devices_1.Light("0x00158d0002c26ef6", "Outside Light Pagode");
    const motion1 = new devices_1.MotionSensor("0x14b457fffe6b2ac8", "Shed Motion Sensor");
    smarthome_1.rule([motion1], () => {
        if (!motion1.on)
            return;
        const hour = new Date().getHours();
        if (hour > 9 && hour <= 16)
            return;
        l1.setState("on");
        l2.setState("on");
    });
    smarthome_1.rule([l1, l2], () => {
        if (l1.hasBeen("on", { forTime: 15 * smarthome_1.units.MINUTES })) {
            l1.turnOff();
        }
        if (l2.hasBeen("on", { forTime: 15 * smarthome_1.units.MINUTES })) {
            l2.turnOff();
        }
    });
    const l3 = new devices_1.Outlet("0x086bd7fffe59a16b", "Christmas Lights");
    const button1 = new devices_1.ToggleSwitch("0x90fd9ffffea7fa8f", "Christmas Lights Button");
    smarthome_1.rule([button1], () => {
        if (button1.button === devices_1.ToggleSwitch.on) {
            l3.turnOn();
        }
        else if (button1.button === devices_1.ToggleSwitch.off) {
            l3.turnOff();
        }
    });
    smarthome_1.rule([l3], () => {
        const hour = new Date().getHours();
        if (hour >= 16 && hour <= 23) {
            smarthome_1.rule.rerunAfter(10 * smarthome_1.units.MINUTES);
            return;
        }
        const timeLeft = 1 * smarthome_1.units.HOUR - l3.hasBeenOnFor();
        if (timeLeft <= 0) {
            l3.turnOff();
        }
        else {
            smarthome_1.rule.rerunAfter(timeLeft);
        }
    });
});
smarthome_1.location("Front Door", () => {
    const l1 = new devices_1.Light("0x0", "Outside Light Front Door");
    const motion1 = new devices_1.MotionSensor("0x14b457fffe4c079a", "Front Door Motion Sensor");
    smarthome_1.rule([motion1], () => {
        if (!motion1.on)
            return;
        const hour = new Date().getHours();
        if (hour > 9 && hour <= 16)
            return;
        l1.setState("on");
    });
    smarthome_1.rule([l1], () => {
        if (l1.hasBeen("on", { forTime: 3 * smarthome_1.units.MINUTES })) {
            l1.turnOff();
        }
    });
});
smarthome_1.location("Toilet", () => {
    const t1 = new devices_1.Light("0x086bd7fffe020c74", "Light 1");
    const t2 = new devices_1.Light("0x1", "Light 2");
    const motion1 = new devices_1.MotionSensor("0x2", "Motion Sensor");
    smarthome_1.rule([motion1, home], () => {
        if (!motion1.on)
            return;
        if (t1.on && t1.byUser && t2.on && t2.byUser)
            return;
        const brightness = home.latenight ? 100 : 255;
        t1.setState("on", { forTime: 125, brightness });
        t2.setState("on", { forTime: 125, brightness });
    });
});
smarthome_1.location("House", () => {
    const vent = new devices_1.Outlet("0x086bd7fffe5c7b72", "Vent High");
    smarthome_1.rule([vent], () => {
        if (vent.hasBeen("on", { forTime: 45 * smarthome_1.units.MINUTES })) {
            vent.turnOff();
        }
    });
});
//# sourceMappingURL=index.js.map