/**
 * Generate sitemap.xml from API announcements
 * Run with: node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://www.sarkariexams.me';
const API_URL = process.env.VITE_API_BASE || 'https://api.sarkariexams.me';

async function generateSitemap() {
  console.log('🗺️  Generating sitemap...');

  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'hourly' },
    { url: '/?type=job', priority: '0.9', changefreq: 'daily' },
    { url: '/?type=result', priority: '0.9', changefreq: 'daily' },
    { url: '/?type=admit-card', priority: '0.9', changefreq: 'daily' },
    { url: '/?type=answer-key', priority: '0.8', changefreq: 'daily' },
    { url: '/?type=admission', priority: '0.8', changefreq: 'daily' },
    { url: '/?type=syllabus', priority: '0.7', changefreq: 'weekly' },
  ];

  // Try to fetch announcements from API
  let announcements = [];
  try {
    const response = await fetch(`${API_URL}/api/announcements`);
    if (response.ok) {
      const data = await response.json();
      announcements = data.data || [];
      console.log(`✅ Fetched ${announcements.length} announcements from API`);
    }
  } catch (_err) {
    console.log('⚠️  Could not fetch announcements, generating static sitemap only');
  }

  // Generate XML
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // Add static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Add announcement pages
  for (const announcement of announcements) {
    const lastmod = announcement.updatedAt || announcement.postedAt || today;
    const formattedDate = new Date(lastmod).toISOString().split('T')[0];

    xml += `  <url>
    <loc>${BASE_URL}/?item=${announcement.slug || announcement.id}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  xml += '</urlset>';

  // Write to public directory
  const outputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, xml);

  console.log(`✅ Sitemap generated: ${outputPath}`);
  console.log(`   - ${staticPages.length} static pages`);
  console.log(`   - ${announcements.length} announcement pages`);
  console.log(`   - Total: ${staticPages.length + announcements.length} URLs`);
}

generateSitemap().catch(console.error);
