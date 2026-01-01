// 1. Using the project's official alias to fix Netlify resolution
import { build } from '@bubo'; 
import { render } from './renderer';
import { writeFileSync } from 'fs';

(async () => {
  // We use the build function to get all feeds across all groups
  const { groups } = await build();
  const allPosts: any[] = [];

  // 2. Flatten the nested structure: Group -> Feed -> Articles
  for (const groupName in groups) {
    const feedsInGroup = groups[groupName];
    
    for (const feed of feedsInGroup) {
      if (feed.articles) {
        for (const article of feed.articles) {
          allPosts.push({
            ...article,
            groupName: groupName, // e.g. "Best", "Alerts"
            feedTitle: feed.title // e.g. "Kottke"
          });
        }
      }
    }
  }

  // 3. Sort everything chronologically (Newest at the top)
  allPosts.sort((a, b) => {
    const dateA = new Date(a.pubDate || 0).getTime();
    const dateB = new Date(b.pubDate || 0).getTime();
    return dateB - dateA;
  });

  // 4. Render the template using the flattened list
  // 'as any' is required to bypass the library's internal type check
  const output = render({ 
    allPosts 
  } as any);

  writeFileSync('./public/index.html', output);
})();
