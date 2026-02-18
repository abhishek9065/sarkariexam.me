import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function read(relativePath) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Missing required file: ${relativePath}`);
    }
    return fs.readFileSync(absolutePath, 'utf8');
}

const files = {
    rootReadme: read('README.md'),
    rootEnvExample: read('.env.example'),
    backendEnvExample: read('backend/.env.example'),
    frontendEnvExample: read('frontend/.env.example'),
    frontendViteConfig: read('frontend/vite.config.ts'),
    dockerComposeDev: read('docker-compose.dev.yml'),
    frontendReadme: read('frontend/README.md'),
};

const failures = [];

function expectContains(text, needle, context) {
    if (!text.includes(needle)) {
        failures.push(`${context} must contain: ${needle}`);
    }
}

function expectNotContains(text, needle, context) {
    if (text.includes(needle)) {
        failures.push(`${context} must not contain: ${needle}`);
    }
}

expectContains(files.backendEnvExample, 'PORT=5000', 'backend/.env.example');
expectContains(files.dockerComposeDev, 'PORT=5000', 'docker-compose.dev.yml backend service env');
expectContains(files.frontendEnvExample, 'VITE_PROXY_TARGET=http://localhost:5000', 'frontend/.env.example');
expectContains(files.frontendViteConfig, "const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';", 'frontend/vite.config.ts');
expectContains(files.rootReadme, 'Backend runs on `http://localhost:5000`.', 'README.md backend setup section');
expectContains(files.frontendReadme, 'VITE_PROXY_TARGET', 'frontend/README.md configuration section');
expectContains(files.frontendReadme, 'http://localhost:4173/api/health', 'frontend/README.md verification section');

expectContains(files.rootEnvExample, 'http://localhost:4173', '.env.example CORS defaults');
expectContains(files.backendEnvExample, 'http://localhost:4173', 'backend/.env.example CORS defaults');

for (const [context, content] of Object.entries({
    '.env.example': files.rootEnvExample,
    'backend/.env.example': files.backendEnvExample,
    'docker-compose.dev.yml': files.dockerComposeDev,
    'frontend/vite.config.ts': files.frontendViteConfig,
})) {
    expectNotContains(content, 'PORT=4000', context);
    expectNotContains(content, 'localhost:5173', context);
}

if (failures.length > 0) {
    console.error('[config-consistency] FAILED');
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log('[config-consistency] OK');
