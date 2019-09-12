import { Context, ActiveStateChangeListener } from "../activestate/Context"
import { ActiveState, hasOwnProperty, StateUpdate } from "../activestate/ActiveState"
// import { App } from "uWebSockets.js"
import fs from "fs"

// fetch("/") -> all devices
// fetch("/", {method: "POST", body: JSON.stringify([{id: "0x000d6f00137466d0", on: true}]) })

function diff(source: ActiveState): StateUpdate | null {
    const start = source._meta.start
    const update = source._meta.update
    if (!start || !update) return null

    const res: any = { id: source.id }
    Object.keys(update).forEach(key => {
        if (update[key] === start[key]) return
        res[key] = update[key]
    })
    return res
}

interface Sender {
    send(data: string): void
}

export class Connection {
    constructor(public context: Context, public server: SyncServer, public sender?: Sender) {}
    start(): this {
        this.server.connections.push(this)
        const data = this.context.states.map(state => state._meta.snapshot())
        this.send(data)
        return this
    }
    close() {
        const at = this.server.connections.indexOf(this)
        if (at < 0) return
        this.server.connections.splice(at, 1)
    }
    send(data: StateUpdate[]) {
        if (!this.sender) return
        this.sender.send(JSON.stringify(data))
    }
    receive(data: StateUpdate[]) {
        this.server.receive(data)
    }
}

export class SyncServer implements ActiveStateChangeListener {
    connections: Connection[] = []

    constructor(public context: Context) {
        context.addChangeListener(this)
    }

    onStatesChanged(sources: ActiveState[]) {
        const diffs = sources.map(source => diff(source)).filter(u => u) as StateUpdate[]
        this.connections.forEach(connection => connection.send(diffs))
    }

    receive(data: StateUpdate[]) {
        // TODO in a transaction
        data.forEach(d => {
            const source = this.context.getStateById(d.id) as ActiveState
            if (!source) return

            const update: any = {}
            Object.keys(d).forEach(key => {
                if (key === "id") return
                if (!hasOwnProperty(source, key)) return
                update[key] = d[key]
            })
            source.updateState(update)
        })
    }

    serve(port = 8080) {
        /*
        App()
            .ws("/ws-api", {
                maxPayloadLength: 5 * 1024 * 1024,
                idleTimeout: 60 * 60 * 24 * 7,
                open: (ws, req) => {
                    console.log("ws open", req.getUrl())
                    ws.connection = new Connection(this.context, this, ws).start()
                },
                message: (ws, message) => {
                    const connection = ws.connection as Connection
                    const data = JSON.parse(Buffer.from(message).toString("utf8"))
                    if (!Array.isArray(data)) {
                        ws.send(JSON.stringify({ error: "expected an array" }))
                        return
                    }
                    connection.receive(data)
                },
                close: (ws, code, message) => {
                    console.log("ws closed", code, message)
                    const connection = ws.connection as Connection
                    connection.close()
                }
            })
            .get("/*", (res, req) => {
                res.writeHeader("Content-Type", "text/html")
                let data: string
                try {
                    data = fs.readFileSync("frontend/index.html", "utf8")
                } catch (e) {
                    data = "<p>error: " + e.toString() + "</p>"
                }
                res.end(data)
            })
            .listen(port, ok => {
                if (!ok) return console.log("opening websocket failed")
                console.log("opened:", port)
            })
            */
    }
}
