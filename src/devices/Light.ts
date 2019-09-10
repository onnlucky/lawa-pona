import { CommandProcessor, OnOffDevice } from "./Device"

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
        if (command === "attributeReport") {
            const state: Partial<Light> = {}
            if (data.onOff !== undefined) {
                state.on = data.onOff === 1
            }
            if (data.currentLevel !== undefined) {
                state.brightness = data.currentLevel
            }
            if (Object.keys(state).length > 0) {
                this.byDevice = true
                this.state.updateState(state)
            }
        }
    }
}
