import { exec } from "child_process"

const osxCommand = "ioreg -r -c IOUSBHostDevice -l"
export function osxOutputParser(output: string) {
    const needle = `"Product Name" = "TI CC25`
    const dev = "/dev/tty.usb"
    const at = output.indexOf(needle)
    if (at < 0) throw Error("cannot find CC25XX device")
    const at2 = output.indexOf(dev, at)
    if (at2 < 0) throw Error("cannot find a /dev/ entry for CC25XX device")
    const at3 = output.indexOf(`"`, at2)
    if (at3 < 0) throw Error("error parsing /dev/ entry")
    return output.slice(at2, at3)
}

const linuxCommand = "ls -l /dev/serial/by-id"
export function linuxOutputParser(output: string) {
    const regex = /TI_CC25[^\n]+-> ..\/..\/(\w+)$/m
    const res = regex.exec(output)
    if (!res) throw Error("cannot find CC25XX device")
    return "/dev/" + res[1]
}

export function findUsbDevice(): Promise<string> {
    let command: string
    let parser: Function
    switch (process.platform) {
        case "darwin":
            command = osxCommand
            parser = osxOutputParser
            break
        case "linux":
            command = linuxCommand
            parser = linuxOutputParser
            break
        default:
            throw Error("unknown platform")
    }

    return new Promise((resolve, reject) => {
        exec(command, (error, output) => {
            if (error) return reject(error)
            resolve(parser(output))
        })
    })
}
