"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ActiveState_1 = require("../activestate/ActiveState");
const uWebSockets_js_1 = require("uWebSockets.js");
const fs_1 = __importDefault(require("fs"));
// fetch("/") -> all devices
// fetch("/", {method: "POST", body: JSON.stringify([{id: "0x000d6f00137466d0", on: true}]) })
function diff(source) {
    const start = source._meta.start;
    const update = source._meta.update;
    if (!start || !update)
        return null;
    const res = { id: source.id };
    Object.keys(update).forEach(key => {
        if (update[key] === start[key])
            return;
        res[key] = update[key];
    });
    return res;
}
class Connection {
    constructor(context, server, sender) {
        this.context = context;
        this.server = server;
        this.sender = sender;
    }
    start() {
        this.server.connections.push(this);
        const data = this.context.states.map(state => state._meta.snapshot());
        this.send(data);
        return this;
    }
    close() {
        const at = this.server.connections.indexOf(this);
        if (at < 0)
            return;
        this.server.connections.splice(at, 1);
    }
    send(data) {
        if (!this.sender)
            return;
        this.sender.send(JSON.stringify(data));
    }
    receive(data) {
        this.server.receive(data);
    }
}
exports.Connection = Connection;
class SyncServer {
    constructor(context) {
        this.context = context;
        this.connections = [];
        context.addChangeListener(this);
    }
    onStatesChanged(sources) {
        const diffs = sources.map(source => diff(source)).filter(u => u);
        this.connections.forEach(connection => connection.send(diffs));
    }
    receive(data) {
        // TODO in a transaction
        data.forEach(d => {
            const source = this.context.getStateById(d.id);
            if (!source)
                return;
            const update = {};
            Object.keys(d).forEach(key => {
                if (key === "id")
                    return;
                if (!ActiveState_1.hasOwnProperty(source, key))
                    return;
                update[key] = d[key];
            });
            source.updateState(update);
        });
    }
    serve(port = 8080) {
        uWebSockets_js_1.App()
            .ws("/ws-api", {
            maxPayloadLength: 5 * 1024 * 1024,
            idleTimeout: 60 * 60 * 24 * 7,
            open: (ws, req) => {
                console.log("ws open", req.getUrl());
                ws.connection = new Connection(this.context, this, ws).start();
            },
            message: (ws, message) => {
                const connection = ws.connection;
                const data = JSON.parse(Buffer.from(message).toString("utf8"));
                if (!Array.isArray(data)) {
                    ws.send(JSON.stringify({ error: "expected an array" }));
                    return;
                }
                connection.receive(data);
            },
            close: (ws, code, message) => {
                console.log("ws closed", code, message);
                const connection = ws.connection;
                connection.close();
            }
        })
            .get("/*", (res, req) => {
            res.writeHeader("Content-Type", "text/html");
            let data;
            try {
                data = fs_1.default.readFileSync("frontend/index.html", "utf8");
            }
            catch (e) {
                data = "<p>error: " + e.toString() + "</p>";
            }
            res.end(data);
        })
            .listen(port, ok => {
            if (!ok)
                return console.log("opening websocket failed");
            console.log("opened:", port);
        });
    }
}
exports.SyncServer = SyncServer;
//# sourceMappingURL=sync.js.map