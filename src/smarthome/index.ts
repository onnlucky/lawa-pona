import { ActiveState } from "activestate/ActiveState"
import { ZigbeeContext } from "zigbee/ZigbeeDevice"
import { Device, Light } from "devices"
import { Context } from "activestate/Context"
export { rule } from "activestate/Links"
import * as units from "./units"
import { SyncServer } from "remote/sync"

export { units }

export interface SmartHomeOptions {
    name: string
    location: string
}

let __current: SmartHome | null = null

export class SmartHome extends ActiveState {
    latenight = false

    static current(): SmartHome {
        if (!__current) throw Error("no SmartHome object found")
        return __current
    }

    constructor(options?: Partial<SmartHomeOptions>) {
        super()
        if (__current) throw Error("a SmartHome object was already created")
        __current = this
        const context = new Context().bind()
        new ZigbeeContext().bind()
        new SyncServer(context).serve()
    }

    forEachDevice(body: (device: Device) => void) {}
    forEachLight(body: (light: Light) => void) {}

    beginLocation(name: string) {}
    endLocation(name: string) {}
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
