import { build } from '@bubo';
import { render } from './renderer';
import { writeFileSync } from 'fs';

async function run() {
  console.log("Starting build process...");
  
  try {
    const { groups } = await build();
    const allPosts: any[] = [];

    // Flattening categories into a single timeline
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

    // Sort by Date (Newest first)
    allPosts.sort((a, b) => {
      const dateA = new Date(a.pubDate || 0).getTime();
      const dateB = new Date(b.pubDate || 0).getTime();
      return dateB - dateA;
    });

    // We pass the data in a way that the renderer expects
    // using 'as any' to allow our new flattened list
    const output = render({ 
      allPosts 
    } as any);
    
    writeFileSync('./public/index.html', output);
    console.log("Success! index.html written.");

  } catch (error) {
    console.error("Build Error:", error);
    process.exit(1);
  }
}

run();
