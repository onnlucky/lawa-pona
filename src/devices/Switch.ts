import { CommandProcessor, OnOffDevice, Device } from "./Device"
import { bind } from "activestate/Links"

export class Switch extends OnOffDevice {
    processor = new SwitchCommandProcessor(this)

    connectTo(sink: OnOffDevice) {
        bind(this, "on", sink, "on")
    }
}

class SwitchCommandProcessor extends CommandProcessor<Switch> {
    stateChanged(_state: Switch, _external: boolean) {}

    receiveCommand(_cluster: string, command: string, _data: any) {
        if (command === "commandOn") {
            this.state.updateState({ on: true })
        } else if (command === "commandOff") {
            this.state.updateState({ on: false })
        }
    }
}

export class ToggleSwitch extends Device {
    static none = "none"
    static on = "on"
    static off = "off"

    count = 0
    button = "none"

    processor = new ToggleSwitchCommandProcessor(this)

    postProcess(_update: Partial<this>) {
        this.button = "none"
    }
}

class ToggleSwitchCommandProcessor extends CommandProcessor<ToggleSwitch> {
    lastTime = 0
    stateChanged(_state: Switch, _external: boolean) {}

    receiveCommand(_cluster: string, command: string, _data: any) {
        if (command === "commandOn") {
            const now = performance.now() / 1000
            const ago = now - this.lastTime
            this.lastTime = now
            const count = ago > 2.5 ? 1 : this.state.count + 1
            this.state.updateState({ button: "on", count })
        } else if (command === "commandOff") {
            this.state.updateState({ button: "off", count: 0 })
        }
    }
}
