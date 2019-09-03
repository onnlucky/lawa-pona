import { ActiveState } from "./ActiveState"

export class Space extends ActiveState {
    latenight = false

    constructor(public config: any) {
        super()
    }
}

// class Implementation implements ActiveStateImplementation {
//     stateChanged(state: Space, external: boolean) {}
// }
