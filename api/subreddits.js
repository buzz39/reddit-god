"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const index_1 = require("../src/index");
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }
        try {
            const input = req.body;
            if (!input.interests || !Array.isArray(input.interests)) {
                return res.status(400).json({ error: 'Invalid input: "interests" must be an array of strings.' });
            }
            const output = yield (0, index_1.run)(input);
            res.status(200).json(output);
        }
        catch (error) {
            console.error('API Error:', error);
            res.status(500).json({ error: 'An internal server error occurred.' });
        }
    });
}
