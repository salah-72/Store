"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalCategory = exports.categoryKey = void 0;
const categoryKey = (s) => s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
exports.categoryKey = categoryKey;
const canonicalCategory = (input, existing) => {
    const key = (0, exports.categoryKey)(input);
    return existing.find((c) => (0, exports.categoryKey)(c) === key) ?? input;
};
exports.canonicalCategory = canonicalCategory;
