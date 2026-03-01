import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const reportPath = path.join(distDir, 'bundle-size-report.json');

if (!fs.existsSync(distDir)) {
    console.error('[bundle-budget] dist/ does not exist. Run `npm run build` first.');
    process.exit(1);
}

function walkFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

function toKB(bytes) {
    return Number((bytes / 1024).toFixed(1));
}

const allFiles = walkFiles(distDir);
const jsFiles = allFiles.filter((file) => file.endsWith('.js'));
const cssFiles = allFiles.filter((file) => file.endsWith('.css'));

const jsStats = jsFiles.map((file) => ({
    file,
    bytes: fs.statSync(file).size,
    name: path.relative(distDir, file),
}));
const cssStats = cssFiles.map((file) => ({
    file,
    bytes: fs.statSync(file).size,
    name: path.relative(distDir, file),
}));

const totalJsBytes = jsStats.reduce((sum, item) => sum + item.bytes, 0);
const totalCssBytes = cssStats.reduce((sum, item) => sum + item.bytes, 0);

const sortedJs = [...jsStats].sort((a, b) => b.bytes - a.bytes);
const largestJs = sortedJs[0] || null;
const adminChunk = sortedJs.find((item) => /admin/i.test(path.basename(item.name)));

const budgets = [
    {
        key: 'totalJs',
        label: 'Total JS',
        bytes: totalJsBytes,
        budget: 850 * 1024,
    },
    {
        key: 'largestJs',
        label: 'Largest JS chunk',
        bytes: largestJs?.bytes ?? 0,
        budget: 420 * 1024,
        file: largestJs?.name,
    },
    {
        key: 'totalCss',
        label: 'Total CSS',
        bytes: totalCssBytes,
        budget: 340 * 1024,
    },
];

if (adminChunk) {
    budgets.push({
        key: 'adminChunk',
        label: 'Admin-related chunk',
        bytes: adminChunk.bytes,
        budget: 340 * 1024,
        file: adminChunk.name,
    });
}

const evaluations = budgets.map((metric) => ({
    ...metric,
    overBudget: metric.bytes > metric.budget,
    bytesKB: toKB(metric.bytes),
    budgetKB: toKB(metric.budget),
}));

const report = {
    generatedAt: new Date().toISOString(),
    totals: {
        jsBytes: totalJsBytes,
        cssBytes: totalCssBytes,
        jsFiles: jsStats.length,
        cssFiles: cssStats.length,
    },
    largestJs: largestJs ? { name: largestJs.name, bytes: largestJs.bytes } : null,
    adminChunk: adminChunk ? { name: adminChunk.name, bytes: adminChunk.bytes } : null,
    budgets: evaluations,
    topJsChunks: sortedJs.slice(0, 8).map((item) => ({ name: item.name, bytes: item.bytes })),
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('[bundle-budget] Generated bundle size report:', path.relative(process.cwd(), reportPath));
for (const metric of evaluations) {
    const suffix = metric.overBudget ? ' (OVER BUDGET)' : '';
    const fileLabel = metric.file ? ` [${metric.file}]` : '';
    console.log(`- ${metric.label}${fileLabel}: ${metric.bytesKB} KB / ${metric.budgetKB} KB${suffix}`);
}

const failed = evaluations.filter((metric) => metric.overBudget);
if (failed.length > 0) {
    console.error('[bundle-budget] Build exceeds configured budget(s):');
    for (const metric of failed) {
        const fileLabel = metric.file ? ` [${metric.file}]` : '';
        console.error(`  - ${metric.label}${fileLabel}: ${metric.bytesKB} KB > ${metric.budgetKB} KB`);
    }
    process.exit(1);
}

console.log('[bundle-budget] All bundle budgets are within thresholds.');
