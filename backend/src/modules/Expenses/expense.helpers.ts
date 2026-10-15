export const categoryKey = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();

export const canonicalCategory = (input: string, existing: string[]) => {
  const key = categoryKey(input);
  return existing.find((c) => categoryKey(c) === key) ?? input;
};
