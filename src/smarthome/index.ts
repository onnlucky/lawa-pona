import { ActiveState, Context, Rule } from "activestate/ActiveState"
import { ZigbeeContext } from "zigbee/ZigbeeDevice"
import { Device, Light } from "devices"

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

    constructor(options: Partial<SmartHomeOptions>) {
        super()
        if (__current) throw Error("a SmartHome object was already created")
        __current = this
        new Context().bind()
        new ZigbeeContext().bind()
    }

    forEachDevice(body: (device: Device) => void) {}
    forEachLight(body: (light: Light) => void) {}

    beginLocation(name: string) {}
    endLocation(name: string) {}
}

export function location(name: string, body: () => void) {
    const home = SmartHome.current()
    home.beginLocation(name)
    body()
    home.endLocation(name)
}

export function rule(onChanges: ActiveState[], body: () => void) {
    return new Rule(onChanges, body)
}

rule.rerunAfter = (seconds: number) => {
    const context = Context.current()
}

import * as units from "activestate/units"
export { units }
