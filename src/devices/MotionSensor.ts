import { OnOffDevice, DeviceImplementation } from "./Device"

export class MotionSensor extends OnOffDevice {
    device = new MotionSensorDevice(this)

    postProcess(_update: Partial<this>) {
        this.on = false
    }
}

class MotionSensorDevice extends DeviceImplementation<MotionSensor> {
    stateChanged(_state: MotionSensor, _external: boolean): void {}

    command(_cluster: string, command: string, _data: any) {
        if (command === "motionDetected") {
            this.state.update("on")
        }
    }
}
