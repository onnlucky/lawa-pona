import { ActiveState, Context } from "./ActiveState"

export class Space extends ActiveState {
    latenight = false

    constructor(public config: any) {
        super()
        new Context().bind()
    }
}

// class Implementation implements ActiveStateImplementation {
//     stateChanged(state: Space, external: boolean) {}
// }
