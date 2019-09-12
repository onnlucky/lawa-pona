import { ActiveState, ActiveStateListener } from "../activestate/ActiveState"
import { ZigbeeDevice, ZigbeeCommandProcessor, ZigbeeContext } from "zigbee/ZigbeeDevice"
import { Context } from "activestate/Context"

// here 3 things come together
// 1. ZigbeeDevice: the remote device as the zigbee software stack represents it
// 2. CommandProcsessor: the object that will processes incoming zigbee commands, and send commands as state changes
// 3. Device: the device represented as pure state, this is what rules are written against

export abstract class CommandProcessor<T extends Device> implements ActiveStateListener, ZigbeeCommandProcessor {
    device: ZigbeeDevice

    constructor(public state: T) {
        state._meta.listener = this
        this.device = ZigbeeContext.current().getDevice(state.id)
        this.device.setCommandProcessor(this)
    }

    receiveCommand(_cluster: string, _command: string, _data: any) {}

    abstract stateChanged(state: ActiveState, external: boolean): void
}

export abstract class Device extends ActiveState {
    processor: CommandProcessor<Device>

    constructor(ieeeAddr: string, public name?: string) {
        super(ieeeAddr)
    }
}

export abstract class OnOffDevice extends Device {
    /** Property 'on' tells if a device os turned on or off. */
    on = false
    lastChange = 0

    get off(): boolean {
        return !this.on
    }

    turnOn(this: OnOffDevice) {
        this.updateState({ on: true })
    }

    turnOff(this: OnOffDevice) {
        this.updateState({ on: false })
    }

    hasBeenOnFor(): number {
        return Context.current().time - this.lastChange
    }
}
