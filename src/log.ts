import Debug from "debug"

export const log = Debug("lawa:log")
export const error = Debug("lawa:error")
export const debug = Debug("lawa:debug")
Debug.enable("lawa:log,lawa:error")
