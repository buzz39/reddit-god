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
const reddit_api_1 = require("../src/reddit-api");
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { path } = req.query;
        if (typeof path !== 'string') {
            return res.status(400).json({ error: 'Invalid path parameter' });
        }
        const pathParts = path.split('/');
        if (pathParts.length < 2) {
            return res.status(400).json({ error: 'Invalid API path' });
        }
        const subreddit = pathParts[0];
        const action = pathParts[1];
        try {
            if (action === 'top') {
                if (req.method !== 'GET') {
                    return res.status(405).json({ error: 'Method Not Allowed' });
                }
                const time = req.query.time || 'day';
                const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
                const posts = yield (0, reddit_api_1.getTopPosts)(subreddit, limit, time);
                return res.status(200).json({ posts, subreddit });
            }
            else if (action === 'comments' && pathParts.length >= 3) {
                if (req.method !== 'GET') {
                    return res.status(405).json({ error: 'Method Not Allowed' });
                }
                const postId = pathParts[2];
                const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
                const comments = yield (0, reddit_api_1.getTopComments)(subreddit, postId, limit);
                return res.status(200).json({ comments });
            }
            else {
                return res.status(404).json({ error: 'API endpoint not found' });
            }
        }
        catch (error) {
            console.error('API Error:', error);
            return res.status(500).json({ error: 'An internal server error occurred.' });
        }
    });
}
