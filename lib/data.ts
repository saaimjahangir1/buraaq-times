// NOTE: no longer used by the live app — the public site now reads real
// content from the database via lib/public-data.ts. Kept as reference
// fixtures (e.g. useful for local UI work without seeding the DB, or for
// tests) but nothing in app/ imports from this file anymore.
import { Post } from "./types";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

const body = [
  "The story develops against a backdrop that has shifted quickly over the past several weeks, with stakeholders on every side recalibrating their positions as new information comes to light.",
  "Analysts note that the underlying trend has been building for some time, but the latest developments have accelerated the timeline in ways few had anticipated at the start of the year.",
  "Reactions have been mixed. Supporters argue the move addresses a long-standing gap, while critics warn of unintended consequences that could take years to fully understand.",
  "What happens next will depend heavily on decisions made in the coming days, as the various parties involved weigh their options and prepare formal responses.",
  "For now, the situation remains fluid, and Buraaq Times will continue to track developments as they unfold, with further reporting expected as new details emerge.",
];

const RAW_POSTS: Omit<Post, "heroImage" | "likeCount" | "saveCount">[] = [
  {
    slug: "central-bank-rate-decision",
    type: "news",
    category: "Business",
    title: "Central Bank Holds Rates Steady, Signals Cautious Path Ahead",
    summary:
      "Policymakers opted against a widely anticipated cut, pointing to persistent inflation pressure in services and housing.",
    author: "Amina Farooq",
    authorRole: "Economics Desk",
    date: "Aug 1, 2026",
    updated: "Aug 2, 2026",
    readTime: "6 min",
    image: img("photo-1611974789855-9c2a0a7236a3"),
    featured: true,
    trending: true,
    views: "48.2K",
    tags: ["Economy", "Monetary Policy", "Markets"],
    body,
  },
  {
    slug: "quantum-chip-breakthrough",
    type: "news",
    category: "Technology",
    title: "Researchers Unveil Room-Temperature Quantum Chip Prototype",
    summary:
      "The prototype sidesteps the need for extreme cooling, a barrier that has slowed commercial quantum computing for a decade.",
    author: "Daniyal Raza",
    authorRole: "Technology Correspondent",
    date: "Aug 1, 2026",
    readTime: "5 min",
    image: img("photo-1518770660439-4636190af475"),
    trending: true,
    editorsPick: true,
    views: "62.7K",
    tags: ["Quantum Computing", "Hardware", "Research"],
    body,
  },
  {
    slug: "coastal-cities-flood-defense",
    type: "news",
    category: "Science",
    title: "Coastal Cities Fast-Track Flood Defenses as Sea Levels Rise",
    summary:
      "A new engineering consortium is piloting modular sea walls that can be deployed in weeks rather than years.",
    author: "Sana Iqbal",
    authorRole: "Science & Environment",
    date: "Jul 31, 2026",
    readTime: "7 min",
    image: img("photo-1500375592092-40eb2168fd21"),
    views: "31.4K",
    tags: ["Climate", "Infrastructure", "Cities"],
    body,
  },
  {
    slug: "midfield-transfer-shakeup",
    type: "news",
    category: "Sports",
    title: "Transfer Window Shakeup: Three Clubs Battle for Star Midfielder",
    summary:
      "The saga has dragged into its third week, with reported bids now exceeding the club's original valuation by 40 percent.",
    author: "Bilal Sheikh",
    authorRole: "Sports Desk",
    date: "Jul 31, 2026",
    readTime: "4 min",
    image: img("photo-1489944440615-453fc2b6a9a9"),
    trending: true,
    views: "55.9K",
    tags: ["Football", "Transfers"],
    body,
  },
  {
    slug: "universal-preschool-rollout",
    type: "news",
    category: "Education",
    title: "Universal Preschool Rollout Reaches Second Phase of Districts",
    summary:
      "Early results from phase one show measurable gains in literacy readiness among participating children.",
    author: "Hina Malik",
    authorRole: "Education Reporter",
    date: "Jul 30, 2026",
    readTime: "5 min",
    image: img("photo-1503676260728-1c00da094a0b"),
    editorsPick: true,
    views: "22.1K",
    tags: ["Policy", "Early Childhood"],
    body,
  },
  {
    slug: "regional-trade-corridor-talks",
    type: "news",
    category: "International",
    title: "Five Nations Advance Talks on New Regional Trade Corridor",
    summary:
      "Negotiators say a framework agreement could be finalized before the end of the year, easing cross-border tariffs.",
    author: "Zoya Ahmed",
    authorRole: "International Desk",
    date: "Jul 29, 2026",
    readTime: "6 min",
    image: img("photo-1526304640581-d334cdbbf45e"),
    views: "19.8K",
    tags: ["Trade", "Diplomacy"],
    body,
  },
  {
    slug: "gut-microbiome-longevity-study",
    type: "article",
    category: "Health",
    title: "What a Decade of Microbiome Research Actually Tells Us About Longevity",
    summary:
      "A long-form look at the science, the hype, and the small number of interventions with real evidence behind them.",
    author: "Dr. Farah Nasir",
    authorRole: "Contributing Writer, Health",
    date: "Jul 28, 2026",
    readTime: "11 min",
    image: img("photo-1576091160399-112ba8d25d1d"),
    featured: true,
    editorsPick: true,
    views: "40.3K",
    tags: ["Health", "Longevity", "Research"],
    body,
  },
  {
    slug: "future-of-remote-work-cities",
    type: "article",
    category: "Business",
    title: "The Cities Quietly Winning the Remote Work Migration",
    summary:
      "Away from the usual headline destinations, a handful of mid-sized cities are rewriting the playbook on attracting talent.",
    author: "Omar Siddiqui",
    authorRole: "Senior Writer",
    date: "Jul 27, 2026",
    readTime: "9 min",
    image: img("photo-1477959858617-67f85cf4f1df"),
    trending: true,
    views: "37.6K",
    tags: ["Work", "Urbanism", "Economy"],
    body,
  },
  {
    slug: "essay-on-ai-and-craft",
    type: "article",
    category: "Technology",
    title: "What Happens to Craft When the Machine Can Also Make It",
    summary:
      "An essay on skill, meaning, and what remains distinctly human as generative tools mature.",
    author: "Daniyal Raza",
    authorRole: "Technology Correspondent",
    date: "Jul 26, 2026",
    readTime: "10 min",
    image: img("photo-1531297484001-80022131f5a1"),
    editorsPick: true,
    views: "44.5K",
    tags: ["AI", "Culture", "Essay"],
    body,
  },
  {
    slug: "inside-a-vertical-farm",
    type: "article",
    category: "Science",
    title: "Inside the Vertical Farm Trying to Feed a Desert City",
    summary:
      "A ground-level report from a facility producing a thousand tonnes of greens a year on a fraction of an acre.",
    author: "Sana Iqbal",
    authorRole: "Science & Environment",
    date: "Jul 25, 2026",
    readTime: "8 min",
    image: img("photo-1585059895524-72359e06133a"),
    trending: true,
    views: "28.9K",
    tags: ["Agriculture", "Sustainability"],
    body,
  },
  {
    slug: "documentary-directors-notebook",
    type: "article",
    category: "Entertainment",
    title: "A Documentary Director's Notebook: Three Years Following One Story",
    summary:
      "On patience, trust, and the ethics of filming someone else's hardest years.",
    author: "Mahnoor Khan",
    authorRole: "Culture Writer",
    date: "Jul 24, 2026",
    readTime: "12 min",
    image: img("photo-1489599849927-2ee91cede3ba"),
    views: "17.2K",
    tags: ["Film", "Craft"],
    body,
  },
  {
    slug: "local-cricket-academy-profile",
    type: "article",
    category: "Local",
    title: "The Cricket Academy Turning a Car Park Into a Talent Pipeline",
    summary:
      "How a volunteer-run academy has sent four players to national age-group squads in five years.",
    author: "Bilal Sheikh",
    authorRole: "Sports Desk",
    date: "Jul 23, 2026",
    readTime: "6 min",
    image: img("photo-1531415074968-036ba1b575da"),
    views: "12.4K",
    tags: ["Cricket", "Community"],
    body,
  },
];

export const POSTS: Post[] = RAW_POSTS.map((p) => ({ ...p, heroImage: p.image, likeCount: 0, saveCount: 0 }));

export const getPost = (type: "news" | "article", slug: string) =>
  POSTS.find((p) => p.slug === slug && p.type === type);

export const byType = (type: "news" | "article") =>
  POSTS.filter((p) => p.type === type);
