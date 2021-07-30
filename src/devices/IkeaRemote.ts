import { OnOffDevice, CommandProcessor } from "./Device"
import { Light } from "./Light"
import { bind } from "../activestate/Links"

export class IkeaRemote extends OnOffDevice {
    processor = new IkeaRemoteCommandProcessor(this)
    level = 0
    button = "none"

    postProcess(_update: Partial<this>) {
        this.button = "none"
    }

    connectTo(sink: Light) {
        bind(this, "on", sink, "on")
        bind(this, "level", sink, "brightness")
    }

    static none = "none"
    static main = "main"
    static dimDown = "dimDown"
    static dimUp = "dimUp"
    static cycleLeft = "cycleLeft"
    static cycleRight = "cycleRight"
}

class IkeaRemoteCommandProcessor extends CommandProcessor<IkeaRemote> {
    level = 0

    stateChanged(state: IkeaRemote, external: boolean) {
        if (external) return
        this.level = state.level
    }

    receiveCommand(_cluster: string, command: string, data: any) {
        let button = IkeaRemote.none
        if (command === "commandToggle") {
            button = IkeaRemote.main
            const on = !this.state.on
            if (on && this.state.level <= 0) {
                this.state.updateState({ on, level: 255, button })
            } else {
                this.state.updateState({ on, button })
            }
        } else if (command === "commandStepWithOnOff" || command === "commandStep") {
            const button = data.stepmode === 0 ? IkeaRemote.dimUp : IkeaRemote.dimDown
            const direction = data.stepmode === 0 ? 1 : -1
            const delta = data.stepsize * direction
            this.level += delta
            if (this.level < 0) this.level = 0
            if (this.level > 255) this.level = 255
            if (this.level !== this.state.level) {
                const on = this.level > 0
                this.state.updateState({ level: this.level, on, button })
            } else {
                this.state.updateState({ button })
            }
        } else if (command === "commandTradfriArrowSingle") {
            button = data.value === 257 ? IkeaRemote.cycleLeft : IkeaRemote.cycleRight
            this.state.updateState({ button })
        }
    }
}
