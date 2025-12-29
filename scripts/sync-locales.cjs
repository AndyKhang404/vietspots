const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const enPath = path.join(localesDir, 'en.json');
const viPath = path.join(localesDir, 'vi.json');

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function mergeKeys(base, target) {
    // return new target with keys from base ensured
    if (typeof base !== 'object' || base === null) return target;
    const out = Array.isArray(base) ? [] : {};
    for (const k of Object.keys(base)) {
        if (typeof base[k] === 'object' && base[k] !== null) {
            out[k] = mergeKeys(base[k], (target && target[k]) || (Array.isArray(base[k]) ? [] : {}));
        } else {
            if (target && Object.prototype.hasOwnProperty.call(target, k)) out[k] = target[k];
            else out[k] = base[k];
        }
    }
    // copy any extra keys from target that base doesn't have
    if (target && typeof target === 'object') {
        for (const k of Object.keys(target)) {
            if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = target[k];
        }
    }
    return out;
}

function main() {
    if (!fs.existsSync(enPath) || !fs.existsSync(viPath)) {
        console.error('Locale files not found in', localesDir);
        process.exit(1);
    }

    const en = readJson(enPath);
    const vi = readJson(viPath);

    // Ensure vi has all keys from en (fill missing with English)
    const viMerged = mergeKeys(en, vi);
    // Ensure en has all keys from vi (fill missing with Vietnamese)
    const enMerged = mergeKeys(vi, en);

    // Write backups
    fs.copyFileSync(enPath, enPath + '.bak');
    fs.copyFileSync(viPath, viPath + '.bak');

    writeJson(enPath, enMerged);
    writeJson(viPath, viMerged);

    console.log('Locales synchronized. Backups created with .bak suffix.');
}

main();
