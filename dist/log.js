"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onevent = exports.command = exports.debug = exports.error = exports.log = void 0;
const debug_1 = __importDefault(require("debug"));
exports.log = debug_1.default("lawa:log");
exports.error = debug_1.default("lawa:error");
exports.debug = debug_1.default("lawa:debug");
exports.command = debug_1.default("lawa:command");
exports.onevent = debug_1.default("lawa:event");
debug_1.default.enable("lawa:log,lawa:error,lawa:command,lawa:event");
//# sourceMappingURL=log.js.map