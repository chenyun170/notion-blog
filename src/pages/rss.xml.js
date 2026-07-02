import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';
import { getPosts } from '../lib/notion';

export const prerender = false;
export const revalidate = 3600;

export async function GET(context) {
	const notionPosts = await getPosts();
	const site = context.site ?? SITE_URL;
	const items = [
		...notionPosts.map((post) => ({
			title: post.title,
			description: post.summary || post.title,
			pubDate: post.date ? new Date(post.date) : new Date(),
			link: new URL(`/posts/${post.slug}`, site).toString(),
		})),
	].sort((a, b) => {
		const ad = a.pubDate ? new Date(a.pubDate).getTime() : 0;
		const bd = b.pubDate ? new Date(b.pubDate).getTime() : 0;
		return bd - ad;
	});

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site,
		language: 'zh-CN',
		items,
	});
}
