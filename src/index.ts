import Parser from 'rss-parser';
import nunjucks from 'nunjucks';
import { writeFileSync, readFileSync } from 'fs';

// 1. Configure the parser with Browser Headers
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
  },
  timeout: 10000 // 10 second limit per feed
});

(async () => {
  console.log("Starting build with Browser Spoofing...");
  try {
    const env = nunjucks.configure({ autoescape: true });
    const feedsData = JSON.parse(readFileSync('./config/feeds.json', 'utf-8'));
    const template = readFileSync('./config/template.html', 'utf-8');
    
    const allPosts: any[] = [];
    const errorFeeds: string[] = [];

    for (const groupName in feedsData) {
      const urls = feedsData[groupName] as string[];
      
      for (const url of urls) {
        try {
          console.log(`Fetching: ${url}`);
          const feed = await parser.parseURL(url);

          if (feed && feed.items) {
            feed.items.forEach((item: any) => {
              allPosts.push({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate || item.isoDate,
                feedTitle: feed.title
              });
            });
          }
        } catch (e: any) {
          console.warn(`Failed: ${url} - Error: ${e.message}`);
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
    console.log(`Build complete. Processed ${allPosts.length} posts with ${errorFeeds.length} errors.`);

  } catch (error) {
    console.error("Critical Build Failure:", error);
    process.exit(1);
  }
})();
