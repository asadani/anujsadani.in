#!/usr/bin/env node
// Rewrites the static fallback counters in index.html from the blog's feeds.
// The page corrects them at runtime; this keeps the pre-JS / crawler value true.
//   node scripts/sync-counts.js           update index.html
//   node scripts/sync-counts.js --check   exit 1 if stale (for CI / pre-push)
const fs = require('fs');
const path = require('path');
const BLOG = process.env.BLOG_URL || 'https://tech.anujsadani.in';
const file = path.join(__dirname, '..', 'index.html');

async function get(p) {
  const r = await fetch(BLOG + p);
  if (!r.ok) throw new Error(p + ' -> ' + r.status);
  return r.json();
}

(async () => {
  const [articles, pubs] = await Promise.all([get('/data/articles.json'), get('/data/publications.json')]);
  const want = {
    essays: articles.length,
    papers: (pubs.papers || []).length,
    books: (pubs.books || []).length + (pubs.digital || []).length,
  };
  let html = fs.readFileSync(file, 'utf8');
  let stale = false;
  for (const [key, n] of Object.entries(want)) {
    const re = new RegExp('(data-count=")([0-9]+)(" data-stat="' + key + '")');
    const m = html.match(re);
    if (!m) throw new Error('counter not found: ' + key);
    if (+m[2] !== n) { stale = true; console.log(key + ': ' + m[2] + ' -> ' + n); }
    html = html.replace(re, (_, a, __, c) => a + n + c);
  }
  if (process.argv.includes('--check')) {
    if (stale) { console.error('index.html fallback counts are stale'); process.exit(1); }
    console.log('counts in sync', want); return;
  }
  fs.writeFileSync(file, html);
  console.log(stale ? 'updated' : 'already in sync', want);
})().catch(e => { console.error(e.message); process.exit(2); });
