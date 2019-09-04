import { SECONDS, MINUTES, PERCENT, HOUR } from "../units"
import { Context, bind, when, ActiveState } from "../ActiveState"

class Light extends ActiveState {
    on = false
    brightness = 0
    get off(): boolean {
        return !this.on
    }

    translateKeyValue(key: string, value: any): [string, any] | null {
        if (key === "off") return ["on", !value]
        return super.translateKeyValue(key, value)
    }

    timeoutExpired(cx: Context) {
        cx.update(this, { on: false })
    }
}

class Button extends ActiveState {
    on = false
}

class Sensor extends ActiveState {
    on = false
    postProcess() {
        this.on = false
    }
}

class Location extends ActiveState {
    latenight = false
}

test("light", () => {
    const light = new Light()
    expect(light.on).toBeFalsy()
    expect(light.off).toBeTruthy()

    light.on = true
    expect(light.on).toBeTruthy()
    expect(light.off).toBeFalsy()
})

test("context", () => {
    const light = new Light()
    expect(light.on).toBeFalsy()

    const cx = new Context()
    cx.change(light, "on")
    expect(light.on).toBeTruthy()
})

test("bind", () => {
    const light = new Light()
    const button = new Button()
    bind(button, "on").to(light, "on")
    expect(light.on).toBeFalsy()
    expect(button.on).toBeFalsy()

    const cx = new Context()
    cx.change(light, "on")
    expect(light.on).toBeTruthy()
    expect(button.on).toBeTruthy()

    cx.change(button, { on: false })
    expect(button.on).toBeFalsy()
    expect(light.on).toBeFalsy()
})

test("sensor, button, night -> light", () => {
    const location = new Location()
    const sensor = new Sensor()
    const button = new Button()
    const light = new Light()

    bind(button, "on").to(light, "on")
    when(sensor, "on")
        .andNot(light, "on", "byUser")
        .then(light, "on", { forTime: 30 * SECONDS })
    when(sensor, "on")
        .andNot(light, "on", "byUser")
        .and(location, "latenight")
        .then(light, "on", { forTime: 30 * SECONDS, brightness: 25 * PERCENT })
    when(light, "on", { forTime: 1 * HOUR })
        .and(location, "latenight")
        .then(light, "off")
    when(light, "off", "byUser").then(sensor, "disabled", { forTime: 10 * SECONDS })

    // initial
    expect(light.on).toBeFalsy()
    expect(light.off).toBeTruthy()

    const cx = new Context()

    // trigger sensor
    cx.change(sensor, "on")
    expect(sensor.on).toBeFalsy()
    expect(light.on).toBeTruthy()
    cx.advanceTime(30 * SECONDS)
    expect(light.on).toBeFalsy()

    // button on
    cx.change(button, "on")
    expect(light.on).toBeTruthy()

    // trigger sensor, light should stay on
    cx.change(sensor, "on")
    expect(light.on).toBeTruthy()
    cx.advanceTime(30 * SECONDS)
    expect(light.on).toBeTruthy()
    cx.advanceTime(30 * SECONDS)
    expect(light.on).toBeTruthy()

    // turn button off, light should go off
    expect(sensor.enabled).toBeTruthy()
    cx.change(button, { on: false })
    expect(light.on).toBeFalsy()
    expect(sensor.enabled).toBeFalsy()

    // sensor should reenable
    cx.advanceTime(30 * SECONDS)
    expect(sensor.enabled).toBeTruthy()

    // latenight should turn lights off
    cx.change(location, "latenight")
    cx.change(light, "on")
    expect(light.on).toBeTruthy()
    cx.advanceTime(30 * MINUTES)
    expect(light.on).toBeTruthy()
    cx.advanceTime(1 * HOUR)
    expect(light.on).toBeFalsy()

    // latenight sensor
    cx.change(sensor, "on")
    expect(light.on).toBeTruthy()
    expect(light.brightness).toEqual(25 * PERCENT)
})
