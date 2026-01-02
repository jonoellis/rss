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

(async () => {
  console.log("🚀 Running Smart-Retry Build...");
  try {
    const env = nunjucks.configure({ autoescape: true });
    const feedsData = JSON.parse(readFileSync('./config/feeds.json', 'utf-8'));
    const template = readFileSync('./config/template.html', 'utf-8');
    const allPosts: any[] = [];
    const errorFeeds: string[] = [];

    for (const groupName in feedsData) {
      for (const url of feedsData[groupName]) {
        let feed;
        try {
          // Attempt 1: Standard
          feed = await standardParser.parseURL(url.trim());
        } catch (e) {
          try {
            // Attempt 2: Stubborn/Loose SSL
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
              title: item.title, link: item.link,
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
  } catch (error) {
    console.error("🔥 Critical Failure:", error);
    process.exit(1);
  }
})();
