import { build } from './bubo/index';
import { render } from './renderer';
import { writeFileSync } from 'fs';

(async () => {
  // The 'build' function returns feeds and groups
  const { groups } = await build();
  const allPosts: any[] = [];

  // 1. Flatten the groups/feeds structure into a single array
  for (const groupName in groups) {
    const feedsInGroup = groups[groupName];
    
    for (const feed of feedsInGroup) {
      if (feed.articles) {
        for (const article of feed.articles) {
          allPosts.push({
            ...article,
            groupName: groupName, // e.g., "Best"
            feedTitle: feed.title // e.g., "Kottke"
          });
        }
      }
    }
  }

  // 2. Sort by date descending
  allPosts.sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  // 3. Render and cast to 'any' to bypass strict type check for the custom template
  const output = render({ 
    allPosts 
  } as any);

  writeFileSync('./public/index.html', output);
})();
