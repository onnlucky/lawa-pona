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
    stateChanged(state: Light, external: boolean): void {
        if (!state.on) {
            this.device.sendCommand({ state: "off" })
        } else {
            this.device.sendCommand({ brightness: state.brightness })
        }
    }

    receiveCommand(_cluster: string, command: string, data: any) {
        if (command === "genOnOff") {
            if (data.state === "on") {
                this.state.update("on")
            } else {
                this.state.update("off")
            }
        }
    }
}
