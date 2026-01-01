import { build } from './bubo/index';
import { render } from './renderer';
import { writeFileSync } from 'fs';

async function run() {
  console.log("Starting build process...");
  
  try {
    const { groups } = await build();
    console.log("Feeds fetched successfully.");

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

    console.log(`Flattened ${allPosts.length} posts. Sorting now...`);

    allPosts.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    const output = render({ allPosts } as any);
    
    writeFileSync('./public/index.html', output);
    console.log("Build complete! index.html written to /public.");

  } catch (error) {
    console.error("FATAL ERROR during build:");
    console.error(error);
    process.exit(1);
  }
}

run();
