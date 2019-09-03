import { ActiveState } from "./ActiveState"

class Collection extends ActiveState {}

class LightCollection extends Collection {
    on = false
    off = true
    brightness = 0
}

export class Location {
    all = new Collection()
    lights = new LightCollection()

    constructor(public name: string, public parent: Location | null = null) {}

    rooms(): Location[] {
        return []
    }
}
