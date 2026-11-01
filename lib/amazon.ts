// Amazonアソシエイト・トラッキングID
const ASSOCIATE_TAG = 'hanakuma22-22';

export function amazonSearchUrl(keyword: string): string {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${ASSOCIATE_TAG}`;
}
