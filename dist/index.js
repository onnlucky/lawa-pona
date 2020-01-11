"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smarthome_1 = require("smarthome");
const devices_1 = require("devices");
const Switch_1 = require("devices/Switch");
const home = new smarthome_1.SmartHome();
smarthome_1.rule([home], () => {
    if (!home.latenight)
        return;
    home.forEachLight(light => {
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
    const lights = [l1, l2, l3, l4];
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
    const s1 = new Switch_1.ToggleSwitch("0x000d6ffffec5f0e4", "All Off Switch");
    const s2 = new Switch_1.ToggleSwitch("0xec1bbdfffebd01d3", "All Off Switch");
    smarthome_1.rule([s1, s2], () => {
        for (const s of [s1, s2]) {
            if (s.button === Switch_1.ToggleSwitch.on) {
                if (s.count > 1) {
                    for (const l of lights)
                        l.turnOn();
                }
                else {
                    for (const l of [l1, l2])
                        l.turnOn();
                }
            }
            else if (s.button === Switch_1.ToggleSwitch.off) {
                for (const l of lights)
                    l.turnOff();
            }
        }
    });
});
smarthome_1.location("Office", () => {
    const heater = new devices_1.Outlet("0x000d6ffffeb1c9dc", "Heater");
});
smarthome_1.location("Toilet", () => {
    const t1 = new devices_1.Light("0x086bd7fffe020c74", "Light 1");
    const t2 = new devices_1.Light("0x2", "Light 2");
    const motion1 = new devices_1.MotionSensor("0x14b457fffe6b2ac8", "Motion Sensor");
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
//# sourceMappingURL=index.js.map