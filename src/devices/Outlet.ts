import { CommandProcessor, OnOffDevice, isNumber } from "./Device"
import { Context } from "../activestate/Context"

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
            if (Context.current().time - this.device.lastCommand < 5) return

            let change = false
            const state: Partial<Outlet> = {}
            if (isNumber(data.onOff)) {
                state.on = data.onOff === 1
                if (this.state.on !== state.on) {
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
