import Parser from 'rss-parser';
import nunjucks from 'nunjucks';
import { writeFileSync, readFileSync } from 'fs';

const parser = new Parser();

(async () => {
  console.log("Starting final build...");
  try {
    // 1. Setup Nunjucks
    const env = nunjucks.configure({ autoescape: true });
    env.addFilter("formatDate", (dateString) => {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : dateString;
    });

    // 2. Load feeds and template
    const feedsData = JSON.parse(readFileSync('./config/feeds.json', 'utf-8'));
    const template = readFileSync('./config/template.html', 'utf-8');
    
    const allPosts: any[] = [];

    // 3. Fetch feeds
    for (const groupName in feedsData) {
      console.log(`Fetching group: ${groupName}`);
      for (const url of feedsData[groupName]) {
        try {
          const feed = await parser.parseURL(url);
          feed.items?.forEach(item => {
            allPosts.push({
              title: item.title,
              link: item.link,
              pubDate: item.pubDate || item.isoDate,
              feedTitle: feed.title,
              groupName: groupName
            });
          });
        } catch (e) {
          console.warn(`Skipping ${url}`);
        }
      }
    }

    // 4. Sort everything Newest to Oldest
    allPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // 5. Render
    const output = env.renderString(template, { 
      data: { allPosts }, // Wrapped for the template
      now: new Date().toUTCString()
    });

    writeFileSync('./public/index.html', output);
    console.log("SUCCESS: index.html generated.");

  } catch (error) {
    console.error("Final Build Error:", error);
    process.exit(1);
  }
})();
