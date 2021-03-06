import { OnOffDevice, CommandProcessor } from "./Device"

export class MotionSensor extends OnOffDevice {
    processor = new MotionSensorCommandProcessor(this)

    postProcess(_update: Partial<this>) {
        this.on = false
    }
}

class MotionSensorCommandProcessor extends CommandProcessor<MotionSensor> {
    stateChanged(_state: MotionSensor, _external: boolean): void {}

    receiveCommand(_cluster: string, command: string, _data: any) {
        if (command === "commandOnWithTimedOff") {
            this.state.updateState({ on: true })
        }
    }
}
