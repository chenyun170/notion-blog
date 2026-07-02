import { SITE_URL } from "../consts";
import { getPosts } from "../lib/notion";
import { postMatchesTopic, TOPICS } from "../lib/topics";

export const prerender = false;
export const revalidate = 3600;
const MIN_INDEXABLE_ARCHIVE_POSTS = 3;
const ABOUT_LASTMOD = "2026-06-10";
const ORAAGENT_LASTMOD = "2026-07-02";

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlEntry(entry) {
  var loc = entry.loc;
  var lastmod = entry.lastmod;
  var changefreq = entry.changefreq || "weekly";
  var priority = entry.priority || "0.7";
  var images = entry.images || [];
  var lines = [];
  lines.push("  <url>");
  lines.push("    <loc>" + xmlEscape(loc) + "</loc>");
  if (lastmod) lines.push("    <lastmod>" + xmlEscape(lastmod) + "</lastmod>");
  lines.push("    <changefreq>" + changefreq + "</changefreq>");
  lines.push("    <priority>" + priority + "</priority>");
  for (var i = 0; i < images.length; i++) {
    var img = images[i];
    lines.push("    <image:image>");
    lines.push("      <image:loc>" + xmlEscape(img.url) + "</image:loc>");
    if (img.title) lines.push("      <image:title>" + xmlEscape(img.title) + "</image:title>");
    lines.push("    </image:image>");
  }
  lines.push("  </url>");
  return lines.join("\n");
}

function absoluteUrl(path) {
  return new URL(path, SITE_URL).toString();
}

function latestPostDate(posts) {
  return posts
    .map(function(post) { return post.date; })
    .filter(Boolean)
    .sort(function(a, b) { return b.localeCompare(a); })[0];
}

export async function GET() {
  var posts = await getPosts();
  var homeLastmod = latestPostDate(posts);
  var tagGroups = new Map();
  for (var i = 0; i < posts.length; i++) {
    var post = posts[i];
    var postTags = post.tags || [];
    for (var j = 0; j < postTags.length; j++) {
      var tag = postTags[j];
      var group = tagGroups.get(tag) || [];
      group.push(post);
      tagGroups.set(tag, group);
    }
  }
  var tags = Array.from(tagGroups.entries())
    .filter(function(entry) { return entry[1].length >= MIN_INDEXABLE_ARCHIVE_POSTS; })
    .map(function(entry) { return { tag: entry[0], lastmod: latestPostDate(entry[1]) }; })
    .sort(function(a, b) { return a.tag.localeCompare(b.tag); });
  var topics = TOPICS
    .map(function(topic) {
      var topicPosts = posts.filter(function(p) { return postMatchesTopic(p, topic); });
      return { topic: topic, posts: topicPosts, lastmod: latestPostDate(topicPosts) };
    })
    .filter(function(t) { return t.posts.length >= MIN_INDEXABLE_ARCHIVE_POSTS; });
  var urls = [
    { loc: absoluteUrl("/"), lastmod: homeLastmod, changefreq: "daily", priority: "1.0" },
    { loc: absoluteUrl("/about"), lastmod: ABOUT_LASTMOD, changefreq: "monthly", priority: "0.5" },
    { loc: absoluteUrl("/oraagent"), lastmod: ORAAGENT_LASTMOD, changefreq: "monthly", priority: "0.8" },
    ...topics.map(function(t) {
      return { loc: absoluteUrl("/topics/" + t.topic.slug), lastmod: t.lastmod, changefreq: "weekly", priority: "0.8" };
    }),
    ...tags.map(function(t) {
      return { loc: absoluteUrl("/tags/" + encodeURIComponent(t.tag)), lastmod: t.lastmod, changefreq: "weekly", priority: "0.6" };
    }),
    ...posts.map(function(p) {
      return {
        loc: absoluteUrl("/posts/" + p.slug),
        lastmod: p.date || undefined,
        changefreq: "monthly",
        priority: "0.7",
        images: p.cover ? [{
          url: p.cover.startsWith("http") ? p.cover : absoluteUrl(p.cover),
          title: p.title,
        }] : [],
      };
    }),
  ];

  var body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls.map(urlEntry),
    '</urlset>',
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
