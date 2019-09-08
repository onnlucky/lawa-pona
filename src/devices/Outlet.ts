import { CommandProcessor, OnOffDevice } from "./Device"

export class Outlet extends OnOffDevice {
    processor = new OutletCommandProcessor(this)
}

class OutletCommandProcessor extends CommandProcessor<Outlet> {
    stateChanged(state: Outlet, external: boolean): void {
        this.device.sendCommand({ state: state.on ? "on" : "off" })
    }

    receiveCommand(_cluster: string, command: string, data: any) {
        if (command === "genOnOff") {
            if (data.state === "on") {
                this.state.updateState({ on: true })
            } else {
                this.state.updateState({ on: false })
            }
        }
    }
}
