const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const backupDir = path.resolve(__dirname, '../.tmp-backup');

const filesToRestore = [
    'configurationSidebarSections.json',
    'configurationSidebarAbout.json',
    'configurationSidebarCommands.json',
];

function cleanupMockBuild() {
    if (!fs.existsSync(backupDir)) {
        console.warn('Warning: Backup directory .tmp-backup/ not found. Nothing to clean up.');
        return;
    }

    console.log('Restoring production config files...');
    for (const prodFile of filesToRestore) {
        const prodPath = path.join(srcDir, prodFile);
        const backupPath = path.join(backupDir, prodFile);

        if (fs.existsSync(backupPath)) {
            // Restore the original file from backup
            fs.copyFileSync(backupPath, prodPath);
            console.log(`Restored ${prodFile} from backup.`);
        } else {
            console.warn(`Warning: Backup for ${prodFile} not found. Cannot restore.`);
        }
    }

    // Clean up the backup directory
    fs.rmSync(backupDir, { recursive: true, force: true });
    console.log('Cleaned up backup directory.');
    console.log('Cleanup complete.');
}

cleanupMockBuild(); 