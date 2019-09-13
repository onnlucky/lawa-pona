# Script Based Home Automation for Zigbee Devices

This is home automation done by writing javascript. It is based on the excellent
zigbee-herdsman. It adds a layer of devices with a simple API and implements
reactive rules.

A simple example:

```js
import { SmartHome, rule, units } from "smarthome"
import { Light, Dimmer } from "devices"
const home = new SmartHome()
const light = new Light("0x000d6f00137466d0", "Dinner Table")
new Dimmer("0x000b57fffe8f5669", "Dimmer").connectTo(light)
```

An example of a reactive rule:

```js
rule([home, light], () => {
    if (!home.latenight) return
    if (light.hasBeen("on", { forTime: 30 * units.Minutes })) {
        light.turnOff()
    }
})
```

That rule will automatically turn the light off after 30 minutes when late at
night. The rule responds to three things:

-   a change to the home object (`latenight`)
-   a change to the light
-   that `hasBeen(...)` call will rerun the rule at the right time

## Requirements

To run, you'll need the hardward described here:
[zigbee2mqtt.io](http://zigbee2mqtt.io).

## Early

It works when hooked up to my laptop :) that is it. No guarantees.

### TODO

-   [ ] Turn in to a proper library.
-   [ ] A name. Lawa pona means good/simple brain in [toki pona](http://tokipona.net).
        But it is not a nimi pona.
-   [x] Read status of devices on start.
-   [ ] Scenes.
-   [ ] Brightness control in app.
-   [x] Web including immediate state synchronization.
-   [ ] Battery and offline status.
-   [ ] Locations, cards in app per floor, sections per room.
