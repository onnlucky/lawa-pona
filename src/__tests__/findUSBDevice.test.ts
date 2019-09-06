import { osxOutputParser, linuxOutputParser } from "../findUsbDevice"

const osxOutput = `
|     | +-o AppleUSBACMControl  <class AppleUSBACMControl, id 0x100007c29, registered, matched, active, busy 0 (0 ms), retain 7>
|     |     {
|     |       "IOProbeScore" = 60000
|     |       "CFBundleIdentifier" = "com.apple.driver.usb.cdc.acm"
|     |       "IOProviderClass" = "IOUSBHostInterface"
|     |       "IOClass" = "AppleUSBACMControl"
|     |       "bInterfaceClass" = 2
|     |       "IOMatchCategory" = "IODefaultMatchCategory"
|     |       "bInterfaceSubClass" = 2
|     |       "bInterfaceProtocol" = 1
|     |     }
|     |
|     +-o IOUSBHostInterface@1  <class IOUSBHostInterface, id 0x100007c1c, registered, matched, active, busy 0 (1336 ms), retain 7>
|       | {
|       |   "USBPortType" = 0
|       |   "IOCFPlugInTypes" = {"2d9786c6-9ef3-11d4-ad51-000a27052861"="IOUSBFamily.kext/Contents/PlugIns/IOUSBLib.bundle"}
|       |   "Product Name" = "TI CC2531 USB CDC"
|       |   "bcdDevice" = 9
|       |   "USBSpeed" = 1
|       |   "idProduct" = 5800
|       |   "bConfigurationValue" = 1
|       |   "bInterfaceSubClass" = 0
|       |   "locationID" = 339804160
|       |   "IOGeneralInterest" = "IOCommand is not serializable"
|       |   "IOServiceLegacyMatchingRegistryID" = 4294999072
|       |   "IOClassNameOverride" = "IOUSBInterface"
|       |   "AppleUSBAlternateServiceRegistryID" = 4294999072
|       |   "idVendor" = 1105
|       |   "bInterfaceProtocol" = 0
|       |   "bAlternateSetting" = 0
|       |   "bInterfaceNumber" = 1
|       |   "bInterfaceClass" = 10
|       | }
|       |
|       +-o AppleUSBACMData  <class AppleUSBACMData, id 0x100007c2b, registered, matched, active, busy 0 (1 ms), retain 6>
|         | {
|         |   "IOClass" = "AppleUSBACMData"
|         |   "CFBundleIdentifier" = "com.apple.driver.usb.cdc.acm"
|         |   "IOProviderClass" = "IOUSBHostInterface"
|         |   "IOTTYBaseName" = "usbmodem"
|         |   "idProduct" = 5800
|         |   "IOProbeScore" = 49999
|         |   "bInterfaceSubClass" = 0
|         |   "HiddenPort" = Yes
|         |   "IOMatchCategory" = "IODefaultMatchCategory"
|         |   "idVendor" = 1105
|         |   "IOTTYSuffix" = "144101"
|         |   "bInterfaceClass" = 10
|         | }
|         |
|         +-o IOSerialBSDClient  <class IOSerialBSDClient, id 0x100007c2c, registered, matched, active, busy 0 (0 ms), retain 5>
|             {
|               "IOClass" = "IOSerialBSDClient"
|               "CFBundleIdentifier" = "com.apple.iokit.IOSerialFamily"
|               "IOProviderClass" = "IOSerialStreamSync"
|               "IOTTYBaseName" = "usbmodem"
|               "IOSerialBSDClientType" = "IORS232SerialStream"
|               "IOProbeScore" = 1000
|               "IOCalloutDevice" = "/dev/cu.usbmodem144101"
|               "IODialinDevice" = "/dev/tty.usbmodem144101"
|               "IOMatchCategory" = "IODefaultMatchCategory"
|               "IOTTYDevice" = "usbmodem144101"
|               "IOResourceMatch" = "IOBSD"
|               "IOTTYSuffix" = "144101"
|             }
|
+-o IOUSBHostInterface@0  <class IOUSBHostInterface, id 0x100007bf8, !registered, !matched, active, busy 0, retain 9>
    {
      "USBPortType" = 0
      "IOCFPlugInTypes" = {"2d9786c6-9ef3-11d4-ad51-000a27052861"="IOUSBFamily.kext/Contents/PlugIns/IOUSBLib.bundle"}
      "bcdDevice" = 17704
      "USBSpeed" = 3
      "idProduct" = 4111`

const linuxOutput = `total 0
lrwxrwxrwx. 1 root root 13 Oct 19 19:26 usb-SOME other vendor _USB_CDC___0X00124B0018ED3DDF-if00 -> ../../ttyDDD0
lrwxrwxrwx. 1 root root 13 Oct 19 19:26 usb-Texas_Instruments_TI_CC2531_USB_CDC___0X00124B0018ED3DDF-if00 -> ../../ttyACM0
lrwxrwxrwx. 1 root root 13 Oct 19 19:26 usb-SOME other vendor _USB_CDC___0X00124B0018ED3DDF-if00 -> ../../ttyDDD0
`

test("parses osx ioreg", () => {
    expect(() => osxOutputParser("xxx")).toThrow()
    expect(osxOutputParser(osxOutput)).toBe("/dev/tty.usbmodem144101")
})

test("parses linux ls -l /dev/serial/by-id", () => {
    expect(() => linuxOutputParser("xxx")).toThrow()
    expect(linuxOutputParser(linuxOutput)).toBe("/dev/ttyACM0")
})
