import Parser from 'rss-parser';
import nunjucks from 'nunjucks';
import { writeFileSync, readFileSync } from 'fs';

const parser = new Parser();

(async () => {
  console.log("Starting build with error tracking...");
  try {
    const env = nunjucks.configure({ autoescape: true });
    const feedsData = JSON.parse(readFileSync('./config/feeds.json', 'utf-8'));
    const template = readFileSync('./config/template.html', 'utf-8');
    
    const allPosts: any[] = [];
    const errorFeeds: string[] = [];

    for (const groupName in feedsData) {
      for (const url of feedsData[groupName]) {
        try {
          // 5-second timeout to keep the build moving
          const feed = await Promise.race([
            parser.parseURL(url),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]) as any;

          feed.items?.forEach(item => {
            allPosts.push({
              title: item.title,
              link: item.link,
              pubDate: item.pubDate || item.isoDate,
              feedTitle: feed.title
            });
          });
        } catch (e) {
          console.warn(`Error with: ${url}`);
          errorFeeds.push(url);
        }
      }
    }

    // Sort Newest to Oldest
    allPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const output = env.renderString(template, { 
      allPosts, 
      errorFeeds,
      now: new Date().toUTCString()
    });

    writeFileSync('./public/index.html', output);
    console.log("SUCCESS: index.html generated with error reports.");

  } catch (error) {
    console.error("Build Error:", error);
    process.exit(1);
  }
})();
