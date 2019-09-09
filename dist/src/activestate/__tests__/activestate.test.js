"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ActiveState_1 = require("../ActiveState");
const Context_1 = require("activestate/Context");
const Links_1 = require("activestate/Links");
class Light extends ActiveState_1.ActiveState {
    constructor() {
        super(...arguments);
        this.on = false;
        this.brightness = 0;
    }
    get off() {
        return !this.on;
    }
}
class Button extends ActiveState_1.ActiveState {
    constructor() {
        super(...arguments);
        this.on = false;
    }
    get off() {
        return !this.on;
    }
}
class Sensor extends ActiveState_1.ActiveState {
    constructor() {
        super(...arguments);
        this.enabled = true;
        this.on = false;
    }
    get disabled() {
        return !this.enabled;
    }
    postProcess() {
        this.on = false;
    }
}
class Location extends ActiveState_1.ActiveState {
    constructor() {
        super(...arguments);
        this.latenight = false;
    }
}
test("light", () => {
    const light = new Light();
    expect(light.on).toBeFalsy();
    expect(light.off).toBeTruthy();
    light.on = true;
    expect(light.on).toBeTruthy();
    expect(light.off).toBeFalsy();
});
test("context", () => {
    const light = new Light();
    expect(light.on).toBeFalsy();
    new Context_1.Context().bind();
    light.setState("on");
    expect(light.on).toBeTruthy();
    let haveRun = false;
    const rule = new Links_1.Rule([light], () => {
        haveRun = true;
        // immediately reflects new state
        expect(light.on).toBeFalsy();
        expect(light.previousState().on).toBeTruthy();
    });
    expect(haveRun).toBeFalsy();
    expect(light._meta.links).toContain(rule);
    light.setState("off");
    expect(light.on).toBeFalsy();
    expect(haveRun).toBeTruthy();
});
test("bind", () => {
    const light = new Light();
    const button = new Button();
    Links_1.bind(button, "on", light, "on");
    expect(light.on).toBeFalsy();
    expect(button.on).toBeFalsy();
    new Context_1.Context().bind();
    light.setState("on");
    expect(light.on).toBeTruthy();
    expect(button.on).toBeTruthy();
    button.setState("off");
    expect(button.on).toBeFalsy();
    expect(light.on).toBeFalsy();
});
test("state.setState(on, forTime: 30)", () => {
    const context = new Context_1.Context().bind();
    const button = new Button();
    button.setState("on", { forTime: 30 });
    expect(button.on).toBeTruthy();
    expect(context.timers).toHaveLength(1);
    context.advanceTimeForTesting(30);
    expect(button.on).toBeFalsy();
});
test("state.hasBeen(on, forTime: 30)", () => {
    const context = new Context_1.Context().bind();
    const button = new Button();
    let counter = 0;
    Links_1.rule([button], () => {
        counter += 1;
        if (button.hasBeen("on", { forTime: 30 })) {
            button.setState("off");
        }
    });
    button.setState("on");
    expect(button.on).toBeTruthy();
    expect(context.timers).toHaveLength(1);
    context.advanceTimeForTesting(30);
    expect(button.on).toBeFalsy();
    expect(context.timers).toHaveLength(0);
    expect(counter).toBe(2);
});
test("sensor, button, night -> light", () => {
    const context = new Context_1.Context().bind();
    const location = new Location();
    const sensor = new Sensor();
    const button = new Button();
    const light = new Light();
    Links_1.bind(button, "on", light, "on");
    Links_1.rule([sensor], () => {
        if (!sensor.on)
            return;
        if (light.on && light.byUser)
            return;
        const brightness = location.latenight ? 100 : 255;
        light.setState("on", { forTime: 30, brightness });
    });
    Links_1.rule([location, light], () => {
        if (!location.latenight)
            return;
        if (light.hasBeen("on", { forTime: 60 * 60 })) {
            light.setState("off");
        }
    });
    Links_1.rule([light], () => {
        if (light.off && light.byUser) {
            sensor.setState("disabled", { forTime: 30 });
        }
    });
    // initial
    expect(light.on).toBeFalsy();
    expect(light.off).toBeTruthy();
    // trigger sensor
    sensor.setState("on");
    expect(sensor.on).toBeFalsy();
    expect(light.on).toBeTruthy();
    expect(light.byUser).toBeFalsy();
    context.advanceTimeForTesting(30);
    expect(light.on).toBeFalsy();
    // button on
    button.setState("on", { byUser: true });
    expect(light.on).toBeTruthy();
    // trigger sensor, light should stay on
    sensor.setState("on");
    expect(light.on).toBeTruthy();
    context.advanceTimeForTesting(30);
    expect(light.on).toBeTruthy();
    context.advanceTimeForTesting(30);
    expect(light.on).toBeTruthy();
    // turn button off, light should go off
    expect(sensor.enabled).toBeTruthy();
    button.setState("off");
    expect(light.on).toBeFalsy();
    expect(sensor.enabled).toBeFalsy();
    // sensor should reenable
    context.advanceTimeForTesting(30);
    expect(sensor.enabled).toBeTruthy();
    // latenight should turn lights off
    location.setState("latenight");
    light.setState("on");
    expect(light.on).toBeTruthy();
    context.advanceTimeForTesting(30 * 60);
    expect(light.on).toBeTruthy();
    context.advanceTimeForTesting(1 * 60 * 60);
    expect(light.on).toBeFalsy();
    // latenight sensor
    sensor.setState("on");
    expect(light.on).toBeTruthy();
    expect(light.brightness).toEqual(100);
});
//# sourceMappingURL=activestate.test.js.map