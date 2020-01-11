import { rule, location, units, SmartHome } from "smarthome"
import { Light, Dimmer, MotionSensor, Outlet, IkeaRemote, Switch } from "devices"
import { ToggleSwitch } from "devices/Switch"

const home = new SmartHome()

rule([home], () => {
    if (!home.latenight) return
    home.forEachLight(light => {
        if (!light.on) return
        const timeLeft = 30 * units.MINUTES - light.hasBeenOnFor()
        if (timeLeft <= 0) {
            light.turnOff()
        } else {
            rule.rerunAfter(timeLeft)
        }
    })
})

location("Living Room", () => {
    const l1 = new Light("0x000d6f00137466d0", "Dinner Table Light")
    new Dimmer("0x000b57fffe8f5669", "Dimmer").connectTo(l1)

    const l2 = new Light("0x14b457fffe79d6bf", "Living Room Light")
    const remote = new IkeaRemote("0x000b57fffef642e1", "Ikea Remote")
    remote.connectTo(l2)

    const l3 = new Outlet("0x000d6ffffedaaa1b", "TV Light")
    const l4 = new Outlet("0x000d6ffffed63ea9", "Reading Light")
    const l5 = new Outlet("0x000d6ffffeb1c9dc", "Christmas Tree Lights")
    new Switch("0x000d6ffffec5f0e4", "Switch").connectTo(l5)

    const lights = [l1, l2, l3, l4]

    rule([remote], () => {
        if (remote.button === IkeaRemote.cycleLeft) {
            l3.turnOff()
            l4.turnOff()
        } else if (remote.button === IkeaRemote.cycleRight) {
            l3.turnOn()
            l4.turnOn()
        }
    })

    const s1 = new ToggleSwitch("0x000d6ffffec5f0e4", "All Off Switch")
    const s2 = new ToggleSwitch("0x0", "All Off Switch")
    rule([s1, s2], () => {
        for (const s of [s1, s2]) {
            if (s.button === ToggleSwitch.on) {
                if (s.count > 1) {
                    for (const l of lights) l.turnOn()
                } else {
                    for (const l of [l1, l2]) l.turnOn()
                }
            } else if (s.button === ToggleSwitch.off) {
                for (const l of lights) l.turnOff()
            }
        }
    })
})

location("Office", () => {
    const heater = new Outlet("0x000d6ffffeb1c9dc", "Heater")
})

location("Toilet", () => {
    const t1 = new Light("0x086bd7fffe020c74", "Light 1")
    const t2 = new Light("0x2", "Light 2")
    const motion1 = new MotionSensor("0x14b457fffe6b2ac8", "Motion Sensor")

    rule([motion1, home], () => {
        if (!motion1.on) return
        if (t1.on && t1.byUser && t2.on && t2.byUser) return
        const brightness = home.latenight ? 100 : 255
        t1.setState("on", { forTime: 125, brightness })
        t2.setState("on", { forTime: 125, brightness })
    })
})
