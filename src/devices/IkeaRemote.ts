import { OnOffDevice, CommandProcessor } from "./Device"
import { Light } from "./Light"
import { bind } from "activestate/ActiveState"

export class IkeaRemote extends OnOffDevice {
    processor = new IkeaRemoteCommandProcessor(this)
    level = 0
    button = "none"

    connectTo(sink: Light) {
        bind(this, "on").to(sink, "on")
        bind(this, "level").to(sink, "brightness")
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
    // The arrow buttons select a value between 0-255.
    // If we track that value, we can figure out which button was pressed.
    lastCycleValue = 0

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
                this.state.update({ on, level: 255, button })
            } else {
                this.state.update({ on, button })
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
                this.state.update({ level: this.level, on, button })
            } else {
                this.state.update({ button })
            }
        } else if (command === "commandTradfriArrowSingle") {
            let direction = this.lastCycleValue - data.value
            this.lastCycleValue = data.value
            if (direction > 200) direction = -1
            if (direction < -200) direction = 1
            if (direction < 0) direction = -1
            if (direction > 0) direction = 1
            button = direction < 0 ? IkeaRemote.cycleLeft : IkeaRemote.cycleRight
            this.state.update({ button })
        }
    }
}
