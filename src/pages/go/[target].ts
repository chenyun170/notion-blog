import type { APIRoute } from "astro";

export const prerender = false;

const targets: Record<string, string> = {
  "oraagent": "https://www.oraskl.com/?i=BB54F6",
  "oraagent-download": "https://agent.oraskl.com/releases/OraAgent/?i=BB54F6",
  "oraskl-customs": "https://www.oraskl.com/hgsj",
  "customs-data": "https://hg.smtso.com/?i=BB54F6",
  "decision-email": "http://h.topeasysoft.com/ww?i=BB54F6",
  "supply-leads": "http://supply.smtso.com/?i=BB54F6",
};

function withUtm(destination: string, target: string): string {
  const url = new URL(destination);
  url.searchParams.set("utm_source", "waimao-intel");
  url.searchParams.set("utm_medium", "site");
  url.searchParams.set("utm_campaign", "oraagent");
  url.searchParams.set("utm_content", target);
  return url.toString();
}

export const GET: APIRoute = ({ params }) => {
  const target = params.target ?? "";
  const destination = targets[target];

  if (!destination) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: withUtm(destination, target),
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};
