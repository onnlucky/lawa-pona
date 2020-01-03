import { State, Context, StateType } from ".."

let context = new Context()
beforeEach(() => {
    context = new Context()
})

afterEach(() => {
    if (!context.isBound()) return
    context.unbind()
})

test("state", () => {
    context.bind()
    expect(Context.current()).toBeTruthy()

    const state = new State()
    expect(state.get("x")).toBeUndefined()

    // initial update
    state.set("x", true)
    expect(state.get("x")).toBeTruthy()
    expect(state.entries.get("x")!.type).toBe(StateType.Boolean)
    expect(state.entries.get("x")!.previous).toBe(false)
    expect(context.changes).toHaveLength(1)

    // multiple updates
    state.set("x", false)
    expect(state.get("x")).toBeFalsy()
    expect(state.entries.get("x")!.previous).toBe(false)
    state.set("x", true)
    expect(state.get("x")).toBeTruthy()
    expect(state.entries.get("x")!.previous).toBe(false)
    expect(context.changes).toHaveLength(1)
})

test("transaction", () => {
    const button = new State()
    const light = new State()

    let counter = 0
    context.defineRule(() => {
        counter += 1
        if (button.get("pressed")) {
            light.set("on", true)
        }
    })

    expect(counter).toBe(0)
    expect(light.get("on")).toBeFalsy()
    expect(counter).toBe(0)
    context.transaction(() => {
        button.signal("pressed")
        expect(counter).toBe(0)
    })
    expect(counter).toBe(2)
    expect(light.get("on")).toBeTruthy()
})

const MINUTES = 60

test("timer", () => {
    context.updateTime(100)
    const light = new State()
    context.transaction(() => {
        light.set("on", true)
    })
    expect(light.entries.get("on")!.lastChange).toBe(100)

    let counter = 0
    context.defineRule(() => {
        counter += 1
        if (light.is("on", { forTime: 30 * MINUTES })) {
            light.set("on", false)
        }
    })

    context.updateTime(101)
    context.transaction(() => {})
    expect(counter).toBe(1)
    expect(light.get("on")).toBeTruthy()
    expect(context.scheduled).toHaveLength(1)

    context.updateTime(200)
    expect(light.get("on")).toBeTruthy()
    expect(context.scheduled).toHaveLength(1)

    context.updateTime(1900)
    expect(context.scheduled).toHaveLength(0)
    expect(light.get("on")).toBeFalsy()
})
