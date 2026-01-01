import Parser from 'rss-parser';
import { render } from './renderer';
import { writeFileSync, readFileSync } from 'fs';

const parser = new Parser();

(async () => {
  console.log("Starting build...");
  try {
    // 1. Load feeds from config/feeds.json
    const feedsData = JSON.parse(readFileSync('./config/feeds.json', 'utf-8'));
    
    // This matches the 'Feeds' type: { [key: string]: object[] }
    const data: any = {}; 

    // 2. Fetch each feed group
    for (const groupName in feedsData) {
      const urls = feedsData[groupName];
      console.log(`Processing group: ${groupName}`);
      
      const groupPosts: any[] = [];

      for (const url of urls) {
        try {
          const feed = await parser.parseURL(url);
          if (feed.items) {
            for (const item of feed.items) {
              groupPosts.push({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate || item.isoDate,
                feedTitle: feed.title
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch ${url}`);
        }
      }

      // Sort this group's posts newest first
      groupPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      
      data[groupName] = groupPosts;
    }

    // 3. Render using the EXACT shape expected by renderer.ts
    // It expects: { data, errors, info }
    const output = render({ 
      data: data,
      errors: []
    });

    writeFileSync('./public/index.html', output);
    console.log("Build successful!");

  } catch (error) {
    console.error("Build Error:", error);
    process.exit(1);
  }
})();
