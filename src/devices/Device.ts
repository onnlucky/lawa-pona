import { ActiveState, ActiveStateListener, Context } from "../activestate/ActiveState"
import { Location } from "../activestate/Location"
import { ZigbeeDevice, ZigbeeDeviceDelegate, ZigbeeContext } from "zigbee/ZigbeeDevice"

export abstract class DeviceImplementation<T extends Device> implements ActiveStateListener, ZigbeeDeviceDelegate {
    backend: ZigbeeDevice

    constructor(public state: T) {
        this.backend = ZigbeeContext.current().find(state.ieeeAddr)
        this.backend.setDelegate(this)
    }

    command(_cluster: string, _command: string, _data: any) {}

    abstract stateChanged(state: ActiveState, external: boolean): void
}

export abstract class Device extends ActiveState {
    device: DeviceImplementation<Device>

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
