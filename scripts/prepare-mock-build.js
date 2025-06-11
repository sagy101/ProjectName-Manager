const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const mockDir = path.resolve(__dirname, '../__tests__/mock-data');
const backupDir = path.resolve(__dirname, '../.tmp-backup');

const filesToSwap = {
    'configurationSidebarSections.json': 'mockConfigurationSidebarSections.json',
    'configurationSidebarAbout.json': 'mockConfigurationSidebarAbout.json',
    'configurationSidebarCommands.json': 'mockConfigurationSidebarCommands.json',
};

function prepareMockBuild() {
    // 1. Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    // 2. Back up production files and swap with mock files
    console.log('Backing up production config and preparing mock build...');
    for (const prodFile in filesToSwap) {
        const prodPath = path.join(srcDir, prodFile);
        const mockPath = path.join(mockDir, filesToSwap[prodFile]);
        const backupPath = path.join(backupDir, prodFile);

        if (fs.existsSync(prodPath)) {
            // Back up the original file
            fs.copyFileSync(prodPath, backupPath);
            console.log(`Backed up ${prodFile} to .tmp-backup/`);
            
            // Overwrite the production file with the mock file
            fs.copyFileSync(mockPath, prodPath);
            console.log(`Swapped in mock version of ${prodFile}`);
        } else {
            console.warn(`Warning: Production file ${prodFile} not found in src/. Skipping.`);
        }
    }
    console.log('Mock build preparation complete.');
}

prepareMockBuild(); 