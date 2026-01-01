import { build } from './bubo/index'; 
import { render } from './renderer';
import { writeFileSync } from 'fs';

(async () => {
  try {
    const { groups } = await build();
    const allPosts: any[] = [];

    for (const groupName in groups) {
      const feedsInGroup = groups[groupName];
      for (const feed of feedsInGroup) {
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

    // Sort Newest to Oldest
    allPosts.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    // Render using 'as any' to allow our custom 'allPosts' variable
    const output = render({ allPosts } as any);

    writeFileSync('./public/index.html', output);
    console.log(`Build successful: ${allPosts.length} posts processed.`);
  } catch (error) {
    console.error("Build failed during execution:", error);
    process.exit(1);
  }
})();
