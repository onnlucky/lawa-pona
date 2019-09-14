import { CommandProcessor, OnOffDevice } from "./Device"

export class Outlet extends OnOffDevice {
    processor = new OutletCommandProcessor(this)
}

class OutletCommandProcessor extends CommandProcessor<Outlet> {
    byDevice = false
    stateChanged(state: Outlet, external: boolean): void {
        if (this.byDevice) {
            this.byDevice = false
            return
        }

        this.device.sendCommand({ state: state.on ? "on" : "off" })
    }

    receiveCommand(_cluster: string, command: string, data: any) {
        if (command === "attributeReport") {
            const state: Partial<Outlet> = {}
            if (data.onOff !== undefined) {
                state.on = data.onOff === 1
            }
            if (Object.keys(state).length > 0) {
                this.byDevice = true
                this.state.updateState(state)
            }
        }
    }
}
