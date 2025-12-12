const fs = require('fs');
const path = require('path');

// Folder/File yang akan diabaikan (Biar gak nyampah)
const IGNORE = new Set([
    'node_modules', 
    '.git', 
    '.vscode', 
    'dist', 
    'coverage', 
    'package-lock.json',
    'yarn.lock',
    '.DS_Store'
]);

function getTree(dir, prefix = '') {
    const name = path.basename(dir);
    
    // Jangan proses jika masuk daftar IGNORE
    if (IGNORE.has(name)) return;

    const isRoot = dir === '.';
    
    // Cetak nama folder/file saat ini (Kecuali root dot '.')
    if (!isRoot) {
        console.log(`${prefix}${name}`);
    }

    let stats;
    try {
        stats = fs.statSync(dir);
    } catch (e) { return; }

    if (stats.isDirectory()) {
        // Ambil isi folder
        const children = fs.readdirSync(dir).filter(child => !IGNORE.has(child));

        // SORTING: Folder di atas, File di bawah. Lalu urut Abjad.
        children.sort((a, b) => {
            const aPath = path.join(dir, a);
            const bPath = path.join(dir, b);
            const aIsDir = fs.statSync(aPath).isDirectory();
            const bIsDir = fs.statSync(bPath).isDirectory();

            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

        // Loop children
        children.forEach((child, index) => {
            const isLast = index === children.length - 1;
            
            // Tentukan konektor cabang
            const connector = isLast ? '└── ' : '├── ';
            
            // Tentukan indentasi untuk anak-anaknya
            // Jika root, prefix kosong. Jika bukan, sesuaikan pipa vertikalnya.
            let childPrefix;
            if (isRoot) {
                childPrefix = '';
            } else {
                childPrefix = prefix.replace('├── ', '│   ').replace('└── ', '    ');
            }

            // Rekursif
            getTree(path.join(dir, child), childPrefix + connector);
        });
    }
}

console.log('📂 TRUPEST PROJECT STRUCTURE');
console.log('============================');
// Jalankan dari current directory
getTree('.');