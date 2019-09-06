import { ActiveState, Context } from "./ActiveState"
import { ZigbeeContext } from "zigbee/ZigbeeDevice"

export class Space extends ActiveState {
    latenight = false

    constructor(public config: any) {
        super()
        new Context().bind()
        new ZigbeeContext().bind()
    }
}
