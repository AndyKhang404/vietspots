const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const enPath = path.join(localesDir, 'en.json');
const viPath = path.join(localesDir, 'vi.json');

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function flatten(obj, prefix = '') {
    const out = [];
    if (typeof obj !== 'object' || obj === null) return out;
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        const pathKey = prefix ? `${prefix}.${key}` : key;
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            out.push(...flatten(val, pathKey));
        } else {
            out.push(pathKey);
        }
    }
    return out;
}

function main() {
    if (!fs.existsSync(enPath) || !fs.existsSync(viPath)) {
        console.error('Locale files not found');
        process.exit(1);
    }
    const en = readJson(enPath);
    const vi = readJson(viPath);
    const enKeys = flatten(en);
    const viKeys = flatten(vi);
    const enSet = new Set(enKeys);
    const viSet = new Set(viKeys);
    const missingInEn = viKeys.filter(k => !enSet.has(k));
    const missingInVi = enKeys.filter(k => !viSet.has(k));

    console.log('Total keys en:', enKeys.length);
    console.log('Total keys vi:', viKeys.length);
    console.log('Missing in en.json (present in vi.json):', missingInEn.length);
    missingInEn.forEach(k => console.log('  ', k));
    console.log('\nMissing in vi.json (present in en.json):', missingInVi.length);
    missingInVi.forEach(k => console.log('  ', k));
}

main();
