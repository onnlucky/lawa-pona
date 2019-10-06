import { ActiveState } from "activestate/ActiveState"
import { ZigbeeContext } from "zigbee/ZigbeeDevice"
import { Device, Light } from "devices"
import { Context } from "activestate/Context"
export { rule } from "activestate/Links"
import * as units from "./units"
import { SyncServer } from "remote/sync"
import { WeekDay, WEEKDAYS } from "./units"

export { units }

export interface SmartHomeOptions {
    name: string
    location: string
    port: number
}

let __current: SmartHome | null = null

export class SmartHome extends ActiveState {
    day: WeekDay = WEEKDAYS[0]
    hour = 0
    minute = 0
    latenight = false

    updateTime = () => {
        const now = new Date()

        const day = WEEKDAYS[now.getDay()]
        const hour = now.getHours()
        const minute = now.getMinutes()
        const latenight = this.hour >= 1 && this.hour < 6
        this.updateState({ day, hour, minute, latenight } as any)
    }

    static current(): SmartHome {
        if (!__current) throw Error("no SmartHome object found")
        return __current
    }

    remove() {
        __current = null
    }

    constructor(options: Partial<SmartHomeOptions> = {}) {
        super("smarthome")
        if (__current) throw Error("a SmartHome object was already created")
        __current = this
        const context = new Context().bind()
        new ZigbeeContext().bind()

        const port = options.port !== undefined ? options.port : 8080
        if (port > 0) {
            new SyncServer(context).serve(port)
        }

        this.updateTime()
        context.addState(this)
        setInterval(this.updateTime, 5000)
    }

    forEachDevice(body: (device: Device) => void) {}
    forEachLight(body: (light: Light) => void) {}

    activeLocation = ""
    beginLocation(name: string) {
        this.activeLocation = name
    }
    endLocation(name: string) {
        this.activeLocation = name
    }
}

export function location(name: string, body: () => void) {
    const home = SmartHome.current()
    home.beginLocation(name)
    try {
        body()
    } finally {
        home.endLocation(name)
    }
}
