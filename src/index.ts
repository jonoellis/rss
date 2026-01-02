import Parser from 'rss-parser';
import nunjucks from 'nunjucks';
import { writeFileSync, readFileSync } from 'fs';
import https from 'https';

// Configure the parser with the most 'human' headers possible
const parser = new Parser({
  requestOptions: {
    // This bypasses some 'Unknown' SSL handshake errors
    agent: new https.Agent({ rejectUnauthorized: false })
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1'
  },
  timeout: 20000, 
});

(async () => {
  console.log("🚀 Running High-Compatibility Build...");
  
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
          // We add a tiny delay between requests so we don't look like a burst-attack
          await new Promise(resolve => setTimeout(resolve, 200)); 
          
          const feed = await parser.parseURL(url.trim());

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
          // If it's UNKNOWN, let's try to see the raw error code
          const rawError = e.code || "UNKNOWN";
          const statusCode = e.status || e.statusCode || rawError;
          
          console.error(`❌ FAILED: ${url} | Code: ${rawError} | Msg: ${e.message}`);
          errorFeeds.push(`${url} (${statusCode})`);
        }
      }
    }

    allPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    const output = env.renderString(template, { 
      allPosts, 
      errorFeeds,
      now: new Date().toUTCString()
    });

    writeFileSync('./public/index.html', output);
    console.log(`\n🎉 Processed ${allPosts.length} posts.`);

  } catch (error) {
    console.error("🔥 Critical Failure:", error);
    process.exit(1);
  }
})();
