import { Device, DeviceImplementation } from "./Device"
import { Light } from "./Light"
import { bind } from "activestate/ActiveState"

export class Dimmer extends Device {
    device = new DimmerDevice(this)
    level = 0

    connectTo(sink: Light) {
        bind(this, "level").to(sink, "brightness")
    }
}

class DimmerDevice extends DeviceImplementation<Dimmer> {
    level = 0
    lastTime = 0
    lastRate = 0

    stateChanged(state: Dimmer, external: boolean) {
        if (external) return
        this.level = state.level
    }

    process(now: number) {
        if (!this.lastTime) return
        const delta = now - this.lastTime
        if (delta < 0 && delta > 2) return

        const change = this.lastRate * delta
        if ((this.level <= 0 || this.level >= 255) && Math.abs(change) < 10) return

        this.level = Math.floor(this.level + change)
        if (this.level < 0) this.level = 0
        if (this.level > 255) this.level = 255

        const level = Math.round(this.level)
        if (level === this.state.level) return
        this.state.update({ level })
    }

    move(rate: number, movemode: number) {
        const now = Date.now() / 1000.0
        const dir = movemode === 0 ? 1 : -1

        this.process(now)
        this.lastTime = now
        this.lastRate = rate * dir
    }

    moveTo(level: number) {
        this.level = level
        this.lastTime = 0
    }

    stop() {
        const now = Date.now() / 1000.0
        this.process(now)
        this.lastTime = 0
    }

    command(_cluster: string, command: string, data: any) {
        if (command === "commandMove" || command === "commandMoveWithOnOff") {
            this.move(data.rate, data.movemode)
        } else if (command === "commandStop" || command === "commandStopWithOnOff") {
            this.stop()
        } else if (command === "commandMoveToLevel" || command === "commandMoveToLevelWithOnOff") {
            this.moveTo(data.level)
        }
    }
}
