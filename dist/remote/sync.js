"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const ActiveState_1 = require("../activestate/ActiveState");
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
        const server = http_1.default.createServer((req, res) => {
            console.log("http", req.method, req.url);
            res.writeHead(200, { "Content-Type": "text/html" });
            let data;
            try {
                data = fs_1.default.readFileSync("frontend/index.html", "utf8");
            }
            catch (e) {
                data = "<p>error: " + e.toString() + "</p>";
            }
            res.end(data);
        });
        const wss = new ws_1.default.Server({ server });
        wss.on("connection", ws => {
            console.log("ws open", ws.url);
            const connection = new Connection(this.context, this, ws).start();
            ws.on("message", message => {
                console.log("received: %s", message);
                const data = JSON.parse(message.toString("utf8"));
                if (!Array.isArray(data)) {
                    ws.send(JSON.stringify({ error: "expected an array" }));
                    return;
                }
                connection.receive(data);
            });
            ws.on("close", (code, reason) => {
                console.log("ws closed", code, reason);
                connection.close();
            });
            ws.on("error", error => {
                console.log("ws error:", error);
                connection.close();
            });
        });
        wss.on("error", error => {
            console.log("ws error:", error);
        });
        server.on("error", error => {
            console.log("http error:", error);
        });
        server.listen(port);
    }
}
exports.SyncServer = SyncServer;
//# sourceMappingURL=sync.js.map