/*
 * 🦉 Bubo Reader
 * ====
 * Dead simple feed reader (RSS + JSON) that renders an HTML
 * page with links to content from feeds organized by site
 *
 * Code: https://github.com/georgemandis/bubo-rss
 * Copyright (c) 2019 George Mandis (https://george.mand.is)
 * Version: 1.0.1 (11/14/2021)
 * Licensed under the MIT License (http://opensource.org/licenses/MIT)
 */

import fetch, { Response } from "node-fetch";
import Parser from "rss-parser";
import { Feeds, FeedItem } from "./@types/bubo";
import { render } from "./renderer.js";
import {
  getLink,
  getTitle,
  getTimestamp,
  parseFeed,
  getFeedList,
  getBuboInfo
} from "./utilities.js";
import { writeFile } from "fs/promises";
import chalk from "chalk";

const buboInfo = await getBuboInfo();
const parser = new Parser();
const feedList = await getFeedList();
const feedListLength =
  Object.entries(feedList).flat(2).length - Object.keys(feedList).length;

/**
 * contentFromAllFeeds = Contains normalized, aggregated feed data and is passed
 * to the template renderer at the end (still needed for type compatibility).
 * errors = Contains errors from parsing feeds and is also passed to template.
 */
const contentFromAllFeeds: Feeds = {};
const errors: unknown[] = [];

// benchmarking data + utility
const initTime = Date.now();
const benchmark = (startTime: number) =>
  chalk.cyanBright.bold(`${(Date.now() - startTime) / 1000} seconds`);

/**
 * These values are used to control throttling/batching the fetches:
 *  - MAX_CONNECTIONS = max number of fetches to contain in a batch
 *  - DELAY_MS = the delay in milliseconds between batches
 */
const MAX_CONNECTIONS = Infinity;
const DELAY_MS = 850;

const error = chalk.bold.red;
const success = chalk.bold.green;

// keeping tally of total feeds fetched and parsed so we can compare
// to feedListLength and know when we're finished.
let completed = 0;

// Shape for the flattened posts passed to the template
type FlatPost = {
  date: string;
  timestamp: number;
  category: string;
  blogName: string;
  title: string;
  url: string;
};

/**
 * normalizeDateToString
 * --
 * Safely turns various date-ish fields into a string.
 */
const normalizeDateToString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    // treat as ms since epoch
    return new Date(value).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return "";
};

/**
 * finishBuild
 * --
 * function that gets called when all the feeds are through fetching
 * and we want to build the static output.
 *
 * This version:
 *  - Flattens all items across all groups into a single list (`flatPosts`)
 *  - Attaches group (as category) and feed title (blog name)
 *  - Sorts by timestamp descending
 *  - Calls render with { data, posts, errors, info } so types stay happy
 */
const finishBuild: () => void = async () => {
  completed++;
  // if this isn't the last feed, just return early
  if (completed !== feedListLength) return;

  process.stdout.write("\nDone fetching everything!\n");

  const flatPosts: FlatPost[] = [];

  for (const [group, feeds] of Object.entries(contentFromAllFeeds)) {
    for (const feed of feeds as FeedItem[]) {
      const blogName = (feed.title as string) || (feed.feed as string) || "";

      feed.items?.forEach(item => {
        // timestamp is always a number
        const ts = (() => {
          const t = item.timestamp ?? getTimestamp(item);
          if (typeof t === "number") return t;
          if (typeof t === "string") {
            const parsed = Date.parse(t);
            return Number.isNaN(parsed) ? 0 : parsed;
          }
          if (t instanceof Date) return t.getTime();
          return 0;
        })();

        const dateString =
          normalizeDateToString(item.isoDate) ||
          normalizeDateToString(item.pubDate) ||
          normalizeDateToString(item.date);

        const title =
          typeof item.title === "string" ? item.title : getTitle(item);

        const url =
          typeof item.link === "string" ? item.link : getLink(item);

        flatPosts.push({
          date: dateString,
          timestamp: ts,
          category: group,
          blogName,
          title,
          url
        });
      });
    }
  }

  // Sort newest first
  flatPosts.sort((a, b) => b.timestamp - a.timestamp);

  // generate the static HTML output from our template renderer
  const output = render({
    // keep original grouped data to satisfy existing types
    data: contentFromAllFeeds,
    // new flat list the template actually uses
    posts: flatPosts,
    errors: errors,
    info: buboInfo
  });

  // write the output to public/index.html
  await writeFile("./public/index.html", output);
  process.stdout.write(
    `\nFinished writing to output:\n- ${feedListLength} feeds in ${benchmark(
      initTime
    )}\n- ${errors.length} errors\n`
  );
};

/**
 * processFeed
 * --
 * Process an individual feed and normalize its items
 * @param { group, feed, startTime}
 * @returns Promise<void>
 */
const processFeed =
  ({
    group,
    feed,
    startTime
  }: {
    group: string;
    feed: string;
    startTime: number;
  }) =>
  async (response: Response): Promise<void> => {
    const body = await parseFeed(response);
    //skip to the next one if this didn't work out
    if (!body) return;

    try {
      const contents: FeedItem = (
        typeof body === "string" ? await parser.parseString(body) : body
      ) as FeedItem;

      contents.feed = feed;
      contents.title = getTitle(contents);
      contents.link = getLink(contents);

      // try to normalize date attribute naming
      contents?.items?.forEach(item => {
        item.timestamp = getTimestamp(item);
        item.title = getTitle(item);
        item.link = getLink(item);
      });

      contentFromAllFeeds[group].push(contents as object);
      process.stdout.write(
        `${success("Successfully fetched:")} ${feed} - ${benchmark(startTime)}\n`
      );
    } catch (err) {
      process.stdout.write(
        `${error("Error processing:")} ${feed} - ${benchmark(
          startTime
        )}\n${err}\n`
      );
      errors.push(`Error processing: ${feed}\n\t${err}`);
    }

    finishBuild();
  };

// go through each group of feeds and process
const processFeeds = () => {
  let idx = 0;

  for (const [group, feeds] of Object.entries(feedList)) {
    contentFromAllFeeds[group] = [];

    for (const feed of feeds) {
      const startTime = Date.now();
      setTimeout(() => {
        process.stdout.write(`Fetching: ${feed}...\n`);

        fetch(feed)
          .then(processFeed({ group, feed, startTime }))
          .catch(err => {
            process.stdout.write(
              error(`Error fetching ${feed} ${benchmark(startTime)}\n`)
            );
            errors.push(`Error fetching ${feed} ${err.toString()}\n`);
            finishBuild();
          });
      }, (idx % (feedListLength / MAX_CONNECTIONS)) * DELAY_MS);
      idx++;
    }
  }
};

processFeeds();
