export type BlogInline =
  | string
  | { type: "link"; href: string; label: string };

export type BlogBlock =
  | { type: "p"; content: BlogInline[] }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: BlogInline[][] }
  | { type: "ol"; items: BlogInline[][] }
  | { type: "image"; src: string; alt: string; width: number; height: number }
  | {
      type: "table";
      headers: [string, string, string];
      rows: [string, string, string][];
    };

export type BlogPost = {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  datePublished: string;
  featuredImage: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  blocks: BlogBlock[];
};

export const BLOG_PATHS = {
  sidr: "/sidr-wild-honey",
  bariMakhi: "/apis-mellifera-honey",
  chhotiMakhi: "/apis-florea-wild-honey",
  tasterTrio: "/taster-trio",
  healthDuo: "/health-duo",
  giftBoxDeluxe: "/gift-box-deluxe",
  wellnessDuo: "/wellness-duo",
  powerPair: "/power-pair",
} as const;

export const BLOG_SLUGS = {
  pureHoney: "/blog/how-to-identify-pure-honey",
  sidrGuide: "/blog/sidr-beri-honey-guide",
  bariVsChhoti: "/blog/bari-makhi-vs-chhoti-makhi-honey",
  talbina: "/blog/talbina-recipe-with-honey",
} as const;
