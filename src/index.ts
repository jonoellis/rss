import { build } from './bubo/index.js';
import { render } from './renderer.js';
import { writeFileSync } from 'fs';

(async () => {
  console.log("Build started...");
  try {
    const { groups } = await build();
    const allPosts: any[] = [];

    // Flatten and tag posts with Category and Blog Name
    for (const groupName in groups) {
      const feeds = groups[groupName];
      for (const feed of feeds) {
        if (feed.articles) {
          for (const article of feed.articles) {
            allPosts.push({
              ...article,
              groupName: groupName,
              feedTitle: feed.title
            });
          }
        }
      }
    }

    // Sort: Most recent at the top
    allPosts.sort((a, b) => {
      const d1 = new Date(a.pubDate || 0).getTime();
      const d2 = new Date(b.pubDate || 0).getTime();
      return d2 - d1;
    });

    // Render using the custom template variable 'allPosts'
    // We cast to any to stop TypeScript from complaining about the custom variable
    const output = render({ allPosts } as any);

    writeFileSync('./public/index.html', output);
    console.log(`Build success: ${allPosts.length} posts generated.`);
  } catch (err) {
    console.error("Critical Build Error:", err);
    process.exit(1);
  }
})();
