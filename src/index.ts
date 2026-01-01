import { build } from './bubo';
import { render } from './renderer';
import { writeFileSync } from 'fs';

(async () => {
  const { feeds, groups } = await build();
  const allPosts: any[] = [];

  // 1. Flatten the groups/feeds structure into a single array
  for (const groupName in groups) {
    const feedsInGroup = groups[groupName];
    
    for (const feed of feedsInGroup) {
      if (feed.articles) {
        for (const article of feed.articles) {
          allPosts.push({
            ...article,
            groupName: groupName, // Category from feeds.json
            feedTitle: feed.title // Name of the blog
          });
        }
      }
    }
  }

  // 2. Sort by date descending
  allPosts.sort((a, b) => {
    return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
  });

  // 3. Render using the new flattened array
  const output = render({ 
    header: '', 
    footer: '', 
    errors: [], // Pass errors if needed from the build result
    allPosts 
  });

  writeFileSync('./public/index.html', output);
})();
