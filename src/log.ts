import Debug from "debug"

export const log = Debug("lawa:log")
export const error = Debug("lawa:error")
export const debug = Debug("lawa:debug")
export const command = Debug("lawa:command")
export const onevent = Debug("lawa:event")
Debug.enable("lawa:log,lawa:error,lawa:command,lawa:event")
