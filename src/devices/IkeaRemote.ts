import { OnOffDevice, CommandProcessor } from "./Device"
import { Light } from "./Light"
import { bind } from "activestate/ActiveState"

export class IkeaRemote extends OnOffDevice {
    processor = new IkeaRemoteCommandProcessor(this)
    level = 0

    connectTo(sink: Light) {
        bind(this, "on").to(sink, "on")
        bind(this, "level").to(sink, "brightness")
    }
}

class IkeaRemoteCommandProcessor extends CommandProcessor<IkeaRemote> {
    level = 0

    stateChanged(state: IkeaRemote, external: boolean) {
        if (external) return
        this.level = state.level
    }

    receiveCommand(_cluster: string, command: string, data: any) {
        if (command === "commandToggle") {
            const on = !this.state.on
            if (on && this.state.level <= 0) {
                this.state.update({ on, level: 255 })
            } else {
                this.state.update({ on })
            }
        } else if (command === "commandStepWithOnOff" || command === "commandStep") {
            const direction = data.stepmode === 0 ? 1 : -1
            const delta = data.stepsize * direction
            this.level += delta
            if (this.level < 0) this.level = 0
            if (this.level > 255) this.level = 255
            if (this.level !== this.state.level) {
                const on = this.level > 0
                this.state.update({ level: this.level, on })
            }
        }
    }
}
