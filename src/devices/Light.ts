import { CommandProcessor, OnOffDevice, inSameRange, isNumber, isBoolean } from "./Device"
import { Context } from "activestate/Context"

export class Light extends OnOffDevice {
    processor = new LightCommandProcessor(this)
    brightness = 0

    postProcess(update: Partial<this>) {
        const on = update.on
        const brightness = update.brightness
        if (on && this.brightness === 0) {
            this.brightness = 255
        } else if (brightness !== undefined && brightness > 0 && on === undefined) {
            this.on = true
        }
        if (this.brightness < 0) this.brightness = 0
        if (this.brightness > 255) this.brightness = 255
    }
}

class LightCommandProcessor extends CommandProcessor<Light> {
    byDevice = false
    stateChanged(state: Light, external: boolean): void {
        if (this.byDevice) {
            this.byDevice = false
            return
        }

        if (!state.on) {
            this.device.sendCommand({ state: "off" })
        } else {
            this.device.sendCommand({ brightness: state.brightness })
        }
    }

    receiveCommand(_cluster: string, command: string, data: any) {
        if (command === "status") {
            if (isBoolean(data.online)) {
                this.state.updateState({ online: data.online })
            }
        } else if (command === "attributeReport") {
            // for most devices, we cannot use nor trust their initial report(s) after a command
            if (Context.current().time - this.device.lastCommand < 5) return

            let change = false
            const state: Partial<Light> = {}
            if (isNumber(data.onOff)) {
                state.on = data.onOff === 1
                if (this.state.on !== state.on) {
                    change = true
                }
            }
            if (isNumber(data.currentLevel)) {
                state.brightness = data.currentLevel
                if (!inSameRange(this.state.brightness, data.currentLevel, 2)) {
                    change = true
                }
                if (!this.state.on && !inSameRange(data.currentLevel, 0, 2) && this.isIkea()) {
                    state.on = true
                    change = true
                }
            }
            if (change) {
                this.byDevice = true
                this.state.updateState(state)
            }
        }
    }
}
