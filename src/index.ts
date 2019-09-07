import { Space } from "activestate/Space"
import { Location } from "activestate/location"
import { MINUTES, SECONDS } from "activestate/units"
import { when } from "activestate/ActiveState"
import { Light, Dimmer, MotionSensor } from "devices"
import { IkeaRemote } from "devices/IkeaRemote"

const space = new Space({ location: "NL" })

const home = new Location("Home")
const groundFloor = new Location("Ground Floor", home)
const livingRoom = new Location("Living Room", groundFloor)
const toilet = new Location("Toilet", groundFloor)

for (const location of home.rooms()) {
    when(space, "latenight")
        .and(space, "config")
        .and(location.lights, "on", { forTime: 30 * MINUTES })
        .then(location.lights, "off")
}

const light1 = new Light("0x000d6f00137466d0", livingRoom, "Dinner Table Light")
const dimmer1 = new Dimmer("0x000b57fffe8f5669", livingRoom, "Dimmer")
dimmer1.connectTo(light1)

const t1 = new Light("0x14b457fffe79d6bf", toilet, "Light 1")
new Light("0x2", toilet, "Light 2")
const motion1 = new MotionSensor("0x14b457fffe6b2ac8", toilet, "Motion Sensor")
when(motion1, "on")
    .andNot(t1, "on")
    .then(t1, "on", { forTime: 5 * SECONDS })
when(motion1, "on")
    .and(space, "latenight")
    .then(toilet.lights, "on", { forTime: 1 * MINUTES, brightness: 0.2 })

const remote = new IkeaRemote("0x000b57fffef642e1", livingRoom, "Ikea Remote")
remote.connectTo(t1)
