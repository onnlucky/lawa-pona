import { DeviceImplementation, OnOffDevice } from "./Device"

export class Light extends OnOffDevice {
    device = new LightDevice(this)
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

class LightDevice extends DeviceImplementation<Light> {
    constructor(light: Light) {
        super(light)
    }

    stateChanged(state: Light, external: boolean): void {
        this.backend.command({ brightness: state.brightness })
    }
}
