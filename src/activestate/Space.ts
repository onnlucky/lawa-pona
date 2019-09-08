import { ActiveState, Context } from "./ActiveState"
import { ZigbeeContext } from "zigbee/ZigbeeDevice"
import { Light } from "devices"

export class Space extends ActiveState {
    latenight = false

    constructor(public config: any) {
        super()
        new Context().bind()
        new ZigbeeContext().bind()
    }

    forEachLight(body: (light: Light) => void) {}
}
