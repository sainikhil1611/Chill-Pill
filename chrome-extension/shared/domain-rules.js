export const PRODUCTIVE_DOMAINS = [
  "asana.com",
  "canvaslms.com",
  "chatgpt.com",
  "claude.ai",
  "clickup.com",
  "codecademy.com",
  "coursera.org",
  "docs.google.com",
  "edx.org",
  "figma.com",
  "github.com",
  "gitlab.com",
  "khanacademy.org",
  "leetcode.com",
  "linear.app",
  "notion.so",
  "overleaf.com",
  "slack.com",
  "stackoverflow.com",
  "trello.com"
];

export const DISTRACTING_DOMAINS = [
  "disneyplus.com",
  "facebook.com",
  "hulu.com",
  "instagram.com",
  "netflix.com",
  "pinterest.com",
  "primevideo.com",
  "reddit.com",
  "tiktok.com",
  "twitch.tv",
  "twitter.com",
  "x.com",
  "youtube.com"
];

function matchesDomain(domain, rule) {
  return domain === rule || domain.endsWith(`.${rule}`);
}

export function classifyDomain(domain) {
  if (PRODUCTIVE_DOMAINS.some((rule) => matchesDomain(domain, rule))) {
    return "productive";
  }

  if (DISTRACTING_DOMAINS.some((rule) => matchesDomain(domain, rule))) {
    return "distracting";
  }

  return "neutral";
}
