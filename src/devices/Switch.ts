import { CommandProcessor, OnOffDevice } from "./Device"
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
