export class Dimmer {
    level = 0

    lastTime = 0
    lastRate = 0

    constructor(public ieeeAddr: string) {}

    process(now: number) {
        if (!this.lastTime) return
        const delta = now - this.lastTime
        if (delta < 0 && delta > 2) return

        const change = this.lastRate * delta
        if ((this.level <= 0 || this.level >= 255) && Math.abs(change) < 10) return

        this.level = Math.floor(this.level + change)
        if (this.level < 0) this.level = 0
        if (this.level > 255) this.level = 255
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
