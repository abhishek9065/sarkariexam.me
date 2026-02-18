#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const sourceRoot = path.join(repoRoot, 'admin-frontend', 'src');
const routeRoot = path.join(sourceRoot, 'routes');
const moduleRoot = path.join(sourceRoot, 'modules');

const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

const requiredPatternChecks = [
    {
        file: path.join(routeRoot, 'AnnouncementsPage.tsx'),
        patterns: ['TableToolbar', 'ActionOverflowMenu'],
        message: 'Announcements must use TableToolbar + ActionOverflowMenu primitives.',
    },
    {
        file: path.join(moduleRoot, 'review', 'ReviewModule.tsx'),
        patterns: ['OpsToolbar', 'OpsTable', 'confirm('],
        message: 'Review module must use OpsToolbar/OpsTable and modal confirm flow.',
    },
    {
        file: path.join(moduleRoot, 'bulk-import', 'BulkImportModule.tsx'),
        patterns: ['ops-modal', 'confirm('],
        message: 'Bulk module must use preview modal + confirm flow before execution.',
    },
    {
        file: path.join(moduleRoot, 'approvals', 'ApprovalsModule.tsx'),
        patterns: ['ops-modal', 'setModal('],
        message: 'Approvals module must use structured modal decision flow.',
    },
];

async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return walk(fullPath);
        }
        if (!allowedExtensions.has(path.extname(entry.name))) {
            return [];
        }
        return [fullPath];
    }));
    return files.flat();
}

function relative(filePath) {
    return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

async function main() {
    const violations = [];

    const sourceFiles = await walk(sourceRoot);
    const routeAndModuleFiles = [
        ...(await walk(routeRoot)),
        ...(await walk(moduleRoot)),
    ];

    for (const filePath of sourceFiles) {
        const content = await fs.readFile(filePath, 'utf8');
        if (content.includes('window.prompt(')) {
            violations.push(`${relative(filePath)}: forbidden window.prompt() usage.`);
        }
    }

    const inlineStylePattern = /\bstyle\s*=\s*\{/;
    for (const filePath of routeAndModuleFiles) {
        const content = await fs.readFile(filePath, 'utf8');
        if (inlineStylePattern.test(content)) {
            violations.push(`${relative(filePath)}: inline style prop found (style={...}) in routes/modules.`);
        }
    }

    for (const check of requiredPatternChecks) {
        let content = '';
        try {
            content = await fs.readFile(check.file, 'utf8');
        } catch {
            violations.push(`${relative(check.file)}: file missing. ${check.message}`);
            continue;
        }

        const missing = check.patterns.filter((pattern) => !content.includes(pattern));
        if (missing.length > 0) {
            violations.push(`${relative(check.file)}: missing patterns [${missing.join(', ')}]. ${check.message}`);
        }
    }

    if (violations.length > 0) {
        console.error('Admin UI guard failed:\n');
        for (const item of violations) {
            console.error(`- ${item}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log('Admin UI guard passed.');
}

await main();
