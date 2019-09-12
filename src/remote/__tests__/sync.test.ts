import { Context } from "activestate/Context"
import { ActiveState } from "activestate/ActiveState"
import { SyncServer, Connection } from "remote/sync"

class TestState extends ActiveState {
    foo = 1
    bar = 1
}

test("should sync", () => {
    const context = new Context().bind()
    const state = new TestState("id1")
    const server = new SyncServer(context)
    const connection = new Connection(context, server)
    const mock = (connection.send = jest.fn())
    server.connections.push(connection)
    connection.start()
    expect(connection.send).toHaveBeenNthCalledWith(1, [{ id: "id1", foo: 1, bar: 1 }])
    mock.mockClear()
    state.updateState({ foo: 255 } as any)
    expect(connection.send).toHaveBeenNthCalledWith(1, [{ id: "id1", foo: 255 }])
    connection.receive([{ id: "id1", foo: 42 }])
    expect(state.foo).toBe(42)
})
