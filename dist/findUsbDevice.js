"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const osxCommand = "ioreg -r -c IOUSBHostDevice -l";
function osxOutputParser(output) {
    const needle = `"Product Name" = "TI CC25`;
    const dev = "/dev/tty.usb";
    const at = output.indexOf(needle);
    if (at < 0)
        throw Error("cannot find CC25XX device");
    const at2 = output.indexOf(dev, at);
    if (at2 < 0)
        throw Error("cannot find a /dev/ entry for CC25XX device");
    const at3 = output.indexOf(`"`, at2);
    if (at3 < 0)
        throw Error("error parsing /dev/ entry");
    return output.slice(at2, at3);
}
exports.osxOutputParser = osxOutputParser;
const linuxCommand = "ls -l /dev/serial/by-id";
function linuxOutputParser(output) {
    const regex = /TI_CC25[^\n]+-> ..\/..\/(\w+)$/m;
    const res = regex.exec(output);
    if (!res)
        throw Error("cannot find CC25XX device");
    return "/dev/" + res[1];
}
exports.linuxOutputParser = linuxOutputParser;
function findUsbDevice() {
    let command;
    let parser;
    switch (process.platform) {
        case "darwin":
            command = osxCommand;
            parser = osxOutputParser;
            break;
        case "linux":
            command = linuxCommand;
            parser = linuxOutputParser;
            break;
        default:
            throw Error("unknown platform");
    }
    return new Promise((resolve, reject) => {
        child_process_1.exec(command, (error, output) => {
            if (error)
                return reject(error);
            try {
                resolve(parser(output));
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
exports.findUsbDevice = findUsbDevice;
//# sourceMappingURL=findUsbDevice.js.map