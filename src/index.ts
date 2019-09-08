import { MINUTES } from "activestate/units"
import { Light, Dimmer, MotionSensor, Outlet, IkeaRemote } from "devices"
import { Space } from "activestate/Space"
import { ActiveState } from "activestate/ActiveState"

function rule(sources: ActiveState[], run: () => void): void {}
function rerunAfter(seconds: number) {}
function location(name: string, body: () => void): void {}

const home = new Space({ location: "NL" })

rule([home], () => {
    if (!home.latenight) return
    home.forEachLight(light => {
        if (!light.on) return
        const timeLeft = 30 * MINUTES - light.hasBeenOnFor()
        if (timeLeft <= 0) {
            light.setState("off")
        } else {
            rerunAfter(timeLeft)
        }
    })
})

location("Living Room", () => {
    const l1 = new Light("0x000d6f00137466d0", "Dinner Table Light")
    new Dimmer("0x000b57fffe8f5669", "Dimmer").connectTo(l1)

    const l2 = new Light("0x00", "Living Room Light")
    const remote = new IkeaRemote("0x000b57fffef642e1", "Ikea Remote")
    remote.connectTo(l2)

    const l3 = new Outlet("0x00", "TV Light")
    const l4 = new Outlet("0x00", "Reading Light")

    rule([remote], () => {
        const off1 = remote.button === IkeaRemote.cycleLeft
        const off2 = remote.level === 0 && remote.button === IkeaRemote.dimDown
        if (off1 || off2) {
            l3.setState("off")
            l4.setState("off")
        } else if (remote.button === IkeaRemote.cycleRight) {
            l3.setState("on")
            l4.setState("on")
        }
    })
})

location("Toilet", () => {
    const t1 = new Light("0x1", "Light 1")
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
