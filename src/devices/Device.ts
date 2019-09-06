import { ActiveState, ActiveStateListener, Context } from "../activestate/ActiveState"
import { Location } from "../activestate/Location"
import { ZigbeeDevice, ZigbeeCommandProcessor, ZigbeeContext } from "zigbee/ZigbeeDevice"

// here 3 things come together
// 1. ZigbeeDevice: the remote device as the zigbee software stack represents it
// 2. CommandProcsessor: the object that will processes incoming zigbee commands, and send commands as state changes
// 3. Device: the device represented as pure state, this is what rules are written against

export abstract class CommandProcessor<T extends Device> implements ActiveStateListener, ZigbeeCommandProcessor {
    device: ZigbeeDevice

    constructor(public state: T) {
        state._listener = this
        this.device = ZigbeeContext.current().find(state.ieeeAddr)
        this.device.setCommandProcessor(this)
    }

    command(_cluster: string, _command: string, _data: any) {}

    abstract stateChanged(state: ActiveState, external: boolean): void
}

export abstract class Device extends ActiveState {
    processor: CommandProcessor<Device>

    constructor(public ieeeAddr: string, public location: Location, public name?: string) {
        super()
    }
}

export abstract class OnOffDevice extends Device {
    /** Property 'on' tells if a device os turned on or off. */
    on = false

    get off(): boolean {
        return !this.on
    }

    translateKeyValue(key: string, value: any): [string, any] | null {
        if (key === "off") return ["on", !value]
        return super.translateKeyValue(key, value)
    }

    timeoutExpired(cx: Context) {
        cx.update(this, { on: false })
    }
}
