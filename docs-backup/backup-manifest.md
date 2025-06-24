# Documentation Backup Manifest

**Backup Date:** $(date)
**Source:** /Users/sashlag/projects/ProjectName-Manager
**Backup Location:** docs-backup/original/

## Files Backed Up

### Main Documentation Directory (`docs/`)
- `architecture-details.md` - 1012 lines (40KB) - **TARGET FOR SPLITTING**
- `configuration-guide.md` - 934 lines (32KB) - **TARGET FOR SPLITTING**  
- `verification-types.md` - 632 lines (16KB)
- `command-system.md` - 587 lines (20KB)
- `testing-guide.md` - 553 lines (28KB)
- `terminal-features.md` - 464 lines (18KB)
- `auto-setup-guide.md` - 315 lines (11KB)
- `getting-started.md` - 184 lines (4.4KB)
- `architecture-overview.md` - 144 lines (4.7KB)
- `index.md` - 78 lines (3.6KB)
- `health-report.md` - 59 lines (2.9KB)
- `llm-experiments.md` - 36 lines (2.2KB)
- `config-export-import.md` - 15 lines (644B)

### Root Files
- `README.md` - 153 lines (main project README)

## Total Stats
- **Total Files:** 14 documentation files
- **Total Lines:** ~5,166 lines
- **Total Size:** ~200KB
- **Files Over 600 Lines:** 2 (architecture-details.md, configuration-guide.md)

## Validation Checksums
```bash
# Generated checksums for validation
find docs-backup/original -name "*.md" -exec md5sum {} \;
```

## Purpose
This backup serves as the source of truth during documentation restructuring to ensure:
1. No content is lost during reorganization
2. All technical details are preserved
3. Code references remain accurate
4. Examples continue to work

## Restoration
To restore original documentation:
```bash
cp -r docs-backup/original/docs/ ./
cp docs-backup/original/README.md ./
``` 