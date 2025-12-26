const fs = require('fs');
const path = 'e:/vietspots/places_scan.json';
const out = 'e:/vietspots/scan_about_keys.txt';
const raw = fs.readFileSync(path, 'utf8');
const data = JSON.parse(raw);
const keys = new Set();
const add = (k) => { if (!k) return; keys.add(k); };
const list = Array.isArray(data) ? data : [data];
for (const p of list) {
    if (!p || !p.about) continue;
    const about = p.about;
    for (const sec of Object.keys(about)) {
        add(sec);
        const val = about[sec];
        if (val && typeof val === 'object') {
            for (const k of Object.keys(val)) {
                add(`${sec}::${k}`);
            }
        }
    }
}
fs.writeFileSync(out, Array.from(keys).sort().join('\n'), 'utf8');
console.log('WROTE', out);
