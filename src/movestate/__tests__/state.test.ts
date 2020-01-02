import { State, Context, StateType } from ".."

test("state", () => {
    const context = new Context().bind()
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
