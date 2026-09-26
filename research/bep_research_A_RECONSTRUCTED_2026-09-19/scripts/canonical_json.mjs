// Reconstructed research utility, not the original Ask OKF implementation.
// RFC 8785-style serialisation using ECMAScript numbers and UTF-16 key order.
// The accompanying test vectors are a bounded test suite, not certification.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
export function parseStrict(text) {
  if (Buffer.byteLength(text, 'utf8') > 2 * 1024 * 1024) throw new Error('INPUT_BYTES');
  let i = 0;
  const ws = () => { while (/[\x20\t\r\n]/.test(text[i] ?? 'X')) i++; };
  function str() {
    const start = i++;
    while (i < text.length) {
      if (text[i] === '\\') { i += 2; continue; }
      if (text[i++] === '"') {
        const v = JSON.parse(text.slice(start, i));
        for (let j = 0; j < v.length; j++) {
          const c = v.charCodeAt(j);
          if (c >= 0xD800 && c <= 0xDBFF) {
            const d = v.charCodeAt(++j);
            if (!(d >= 0xDC00 && d <= 0xDFFF)) throw new Error('LONE_SURROGATE');
          } else if (c >= 0xDC00 && c <= 0xDFFF) throw new Error('LONE_SURROGATE');
        }
        return v;
      }
    }
    throw new Error('UNTERMINATED_STRING');
  }
  function value(depth = 0) {
    if (depth > 64) throw new Error('DEPTH');
    ws(); const c = text[i];
    if (c === '"') return str();
    if (c === '{') {
      i++; ws(); const obj = Object.create(null); const keys = new Set();
      if (text[i] === '}') { i++; return obj; }
      while (true) {
        ws(); if (text[i] !== '"') throw new Error('OBJECT_KEY');
        const key = str(); if (keys.has(key)) throw new Error('DUPLICATE_KEY'); keys.add(key);
        ws(); if (text[i++] !== ':') throw new Error('COLON');
        obj[key] = value(depth+1); ws();
        const sep = text[i++]; if (sep === '}') return obj;
        if (sep !== ',') throw new Error('OBJECT_SEPARATOR');
      }
    }
    if (c === '[') {
      i++; ws(); const a=[]; if (text[i] === ']') { i++; return a; }
      while (true) {
        a.push(value(depth+1)); ws(); const sep=text[i++];
        if (sep === ']') return a; if (sep !== ',') throw new Error('ARRAY_SEPARATOR');
      }
    }
    for (const [word,v] of [['true',true],['false',false],['null',null]]) {
      if (text.startsWith(word,i)) {i+=word.length;return v;}
    }
    const m=text.slice(i).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (!m) throw new Error('JSON_VALUE'); i+=m[0].length;
    const n=Number(m[0]); if (!Number.isFinite(n)) throw new Error('NON_FINITE'); return n;
  }
  const out=value(); ws(); if (i !== text.length) throw new Error('TRAILING_INPUT'); return out;
}
export function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
  return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(canonical(parseStrict(fs.readFileSync(0,'utf8')))); }
  catch (e) { process.stderr.write(String(e.message)+'\n'); process.exitCode=2; }
}
