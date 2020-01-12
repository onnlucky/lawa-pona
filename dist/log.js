"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
exports.log = debug_1.default("lawa:log");
exports.error = debug_1.default("lawa:error");
exports.debug = debug_1.default("lawa:debug");
exports.command = debug_1.default("lawa:command");
debug_1.default.enable("lawa:log,lawa:error,lawa:command");
//# sourceMappingURL=log.js.map