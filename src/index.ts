import Parser from 'rss-parser';
import nunjucks from 'nunjucks';
import { writeFileSync, readFileSync } from 'fs';
import https from 'https';

const standardParser = new Parser({ timeout: 10000 });
const stubbornParser = new Parser({
  requestOptions: {
    agent: new https.Agent({ rejectUnauthorized: false })
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36',
  },
  timeout: 15000,
});

/**
 * Clean common HTML entities found in RSS titles (like kottke.org)
 * without adding new npm dependencies.
 */
function cleanTitle(str: string | undefined): string {
  if (!str) return 'Untitled';
  return str
    .replace(/&#8220;/g, '“')  // Left Double Quote
    .replace(/&#8221;/g, '”')  // Right Double Quote
    .replace(/&#8216;/g, '‘')  // Left Single Quote
    .replace(/&#8217;/g, '’')  // Right Single Quote / Apostrophe
    .replace(/&#8211;/g, '–')  // En Dash
    .replace(/&#8212;/g, '—')  // Em Dash
    .replace(/&#8230;/g, '...') // Ellipsis
    .replace(/&amp;/g, '&')    // Ampersand
    .replace(/&quot;/g, '"')   // Quote
    .replace(/&lt;/g, '<')     // Less than
    .replace(/&gt;/g, '>');    // Greater than
}

(async () => {
  console.log("🚀 Running Smart-Retry Build with Title Cleaning...");
  try {
    const env = nunjucks.configure({ autoescape: true });
    const feedsData = JSON.parse(readFileSync('./config/feeds.json', 'utf-8'));
    const template = readFileSync('./config/template.html', 'utf-8');
    const allPosts: any[] = [];
    const errorFeeds: string[] = [];

    for (const groupName in feedsData) {
      for (const url of feedsData[groupName]) {
        let feed: any;
        
        try {
          feed = await standardParser.parseURL(url.trim());
        } catch (e) {
          try {
            console.log(`⚠️ Retrying with loose settings: ${url}`);
            feed = await stubbornParser.parseURL(url.trim());
          } catch (retryError: any) {
            console.error(`❌ FAILED: ${url} | ${retryError.message}`);
            errorFeeds.push(`${url} (${retryError.code || 'FAIL'})`);
          }
        }

        if (feed && feed.items) {
          feed.items.forEach((item: any) => {
            allPosts.push({
              // Apply the cleaning function here
              title: cleanTitle(item.title), 
              link: item.link,
              pubDate: item.pubDate || item.isoDate,
              feedTitle: feed.title
            });
          });
        }
      }
    }

    allPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    const output = env.renderString(template, { allPosts, errorFeeds, now: new Date().toUTCString() });
    writeFileSync('./public/index.html', output);
    console.log("✅ Build Successful");
  } catch (error) {
    console.error("🔥 Critical Failure:", error);
    process.exit(1);
  }
})();
