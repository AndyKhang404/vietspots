const fs = require('fs');
const enPath = 'e:/vietspots/src/i18n/locales/en.json';
const viPath = 'e:/vietspots/src/i18n/locales/vi.json';
const out = 'e:/vietspots/locale_diff.txt';
function flatten(obj, prefix = '') {
    const keys = [];
    if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(k => {
            const v = obj[k];
            const p = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                keys.push(...flatten(v, p));
            } else {
                keys.push(p);
            }
        });
    }
    return keys;
}
try {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));
    const enKeys = new Set(flatten(en));
    const viKeys = new Set(flatten(vi));

    const enOnly = [...enKeys].filter(k => !viKeys.has(k)).sort();
    const viOnly = [...viKeys].filter(k => !enKeys.has(k)).sort();

    const outText = [];
    outText.push('Keys in en.json but missing in vi.json:\n');
    enOnly.forEach(k => outText.push(k));
    outText.push('\nKeys in vi.json but missing in en.json:\n');
    viOnly.forEach(k => outText.push(k));
    fs.writeFileSync(out, outText.join('\n'), 'utf8');
    console.log('WROTE', out);
} catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
}
