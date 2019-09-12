"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Context_1 = require("activestate/Context");
const ActiveState_1 = require("activestate/ActiveState");
const sync_1 = require("remote/sync");
class TestState extends ActiveState_1.ActiveState {
    constructor() {
        super(...arguments);
        this.foo = 1;
        this.bar = 1;
    }
}
test("should sync", () => {
    const context = new Context_1.Context().bind();
    const state = new TestState("id1");
    const server = new sync_1.SyncServer(context);
    const connection = new sync_1.Connection(context, server);
    const mock = (connection.send = jest.fn());
    server.connections.push(connection);
    connection.start();
    expect(connection.send).toHaveBeenNthCalledWith(1, [{ id: "id1", foo: 1, bar: 1 }]);
    mock.mockClear();
    state.updateState({ foo: 255 });
    expect(connection.send).toHaveBeenNthCalledWith(1, [{ id: "id1", foo: 255 }]);
    connection.receive([{ id: "id1", foo: 42 }]);
    expect(state.foo).toBe(42);
});
//# sourceMappingURL=sync.test.js.map