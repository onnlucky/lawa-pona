import { CommandProcessor, OnOffDevice } from "./Device"

export class Light extends OnOffDevice {
    processor = new LightCommandProcessor(this)
    brightness = 0

    postProcess(update: Partial<this>) {
        const on = update.on
        const brightness = update.brightness
        if (on && this.brightness === 0) {
            this.brightness = 1
        } else if (brightness !== undefined && brightness > 0) {
            this.on = true
        }
    }
}

class LightCommandProcessor extends CommandProcessor<Light> {
    constructor(light: Light) {
        super(light)
    }

    stateChanged(state: Light, external: boolean): void {
        this.device.command({ brightness: state.brightness })
    }
}
