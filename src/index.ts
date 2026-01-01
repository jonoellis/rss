import { build } from './bubo/index.js';
import { render } from './renderer.js';
import { writeFileSync } from 'fs';

(async () => {
  try {
    // 1. Fetch and process feeds
    const { groups } = await build();
    const allPosts: any[] = [];

    // 2. Flatten the Categories/Groups into one list
    for (const groupName in groups) {
      const feedsInGroup = groups[groupName];
      for (const feed of feedsInGroup) {
        if (feed.articles) {
          for (const article of feed.articles) {
            allPosts.push({
              ...article,
              groupName: groupName, // Category: Best, Alerts, etc.
              feedTitle: feed.title // Blog name
            });
          }
        }
      }
    }

    // 3. Sort: Newest posts first
    allPosts.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    // 4. Render the HTML 
    // We pass 'allPosts' to your template. 'as any' prevents TS build errors.
    const output = render({ allPosts } as any);

    // 5. Write the final file
    writeFileSync('./public/index.html', output);
    console.log(`Successfully processed ${allPosts.length} posts.`);

  } catch (err) {
    console.error("Build Runtime Error:", err);
    process.exit(1);
  }
})();
