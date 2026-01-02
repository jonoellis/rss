import Parser from 'rss-parser';
import nunjucks from 'nunjucks';
import { writeFileSync, readFileSync } from 'fs';

// 1. Configure the parser with "Human-like" headers to bypass basic bot blocks
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml;q=0.9, */*;q=0.8',
    'Cache-Control': 'no-cache',
  },
  timeout: 15000, // 15 seconds
});

(async () => {
  console.log("🚀 Starting build with Enhanced Logging...");
  
  try {
    const env = nunjucks.configure({ autoescape: true });
    const feedsData = JSON.parse(readFileSync('./config/feeds.json', 'utf-8'));
    const template = readFileSync('./config/template.html', 'utf-8');
    
    const allPosts: any[] = [];
    const errorFeeds: string[] = [];

    // Loop through categories (Groups)
    for (const groupName in feedsData) {
      const urls = feedsData[groupName] as string[];
      
      for (const url of urls) {
        try {
          console.log(`📡 Fetching: ${url}`);
          
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
            console.log(`✅ Success: ${feed.title} (${feed.items.length} items)`);
          }
        } catch (e: any) {
          // ENHANCED LOGGING STARTS HERE
          const statusCode = e.status || e.statusCode || "UNKNOWN";
          const errorMsg = e.message || "No specific error message";
          
          console.error(`❌ FAILED: ${url}`);
          console.error(`   HTTP Status: ${statusCode}`);
          console.error(`   Error Detail: ${errorMsg}`);

          // Add to the list shown on your website's footer
          errorFeeds.push(`${url} (Status: ${statusCode})`);
        }
      }
    }

    // Sort Newest to Oldest internally
    allPosts.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    // Render the HTML
    const output = env.renderString(template, { 
      allPosts, 
      errorFeeds,
      now: new Date().toUTCString()
    });

    writeFileSync('./public/index.html', output);
    console.log(`\n🎉 Build complete! Total Posts: ${allPosts.length} | Errors: ${errorFeeds.length}`);

  } catch (error) {
    console.error("🔥 Critical Build Failure:", error);
    process.exit(1);
  }
})();
