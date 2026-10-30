import type { BlogPost } from "@/lib/blog/types";
import { BLOG_PATHS, BLOG_SLUGS } from "@/lib/blog/types";

const SLUG_PURE = "how-to-identify-pure-honey";
const SLUG_SIDR = "sidr-beri-honey-guide";
const SLUG_BARI = "bari-makhi-vs-chhoti-makhi-honey";
const SLUG_TALBINA = "talbina-recipe-with-honey";

function blogImage(slug: string, filename: string): string {
  return `/blog/${slug}/${filename}`;
}

const posts: BlogPost[] = [
  {
    slug: SLUG_PURE,
    title: "Asli Shahad Ki Pehchan: How to Identify Pure Honey in Pakistan",
    seoTitle: "Asli Shahad Ki Pehchan: How to Identify Pure Honey in Pakistan",
    metaDescription:
      "Asli shahad ki pehchan kaise karein? Learn which home tests work, which are myths, and what really tells pure honey from fake honey in Pakistan.",
    datePublished: "2026-10-29",
    featuredImage: {
      src: blogImage(SLUG_PURE, "asli-shahad-kipehchan-purehoney.webp"),
      alt: "Pure wild honey being poured from a spoon into an Al-Barakah jar",
      width: 1200,
      height: 630,
    },
    blocks: [
      {
        type: "p",
        content: [
          'Every honey jar in the market says "100% pure". Yet adulterated honey, mixed with sugar syrup or glucose, is common in Pakistan. So how do you know what you are buying?',
        ],
      },
      {
        type: "p",
        content: [
          "This guide explains the popular home tests, which ones actually mean something, and what to look for before you buy.",
        ],
      },
      { type: "h2", text: "Why fake honey is so common" },
      {
        type: "p",
        content: [
          'Pure wild honey is slow and costly to collect. Sugar syrup is cheap. Mixing the two lets sellers offer "honey" at a price no real beekeeper can match. If a 1 kg jar costs far less than the market rate for real honey, that alone is a warning sign.',
        ],
      },
      { type: "h2", text: "Popular home tests, and what they really tell you" },
      {
        type: "ol",
        items: [
          [
            "The water test ",
            "Drop a spoon of honey into a glass of water. Thick, pure honey usually sinks to the bottom as a lump and dissolves slowly. Thin, syrupy honey spreads quickly. ",
            "Verdict: useful as a quick sign, but very thick sugar syrup can also sink.",
          ],
          [
            "The thumb test ",
            "Put a drop on your thumb. Pure honey tends to stay in place; diluted honey runs off. ",
            "Verdict: tells you about thickness, not purity.",
          ],
          [
            "The flame test (matchstick) ",
            "Dip a matchstick in honey and strike it. People say pure honey lets it light. ",
            "Verdict: mostly a myth. It shows whether the honey has extra water, not whether sugar was added.",
          ],
          [
            "The paper or cloth test ",
            "Put a drop on tissue paper. Watery honey leaves a wet ring. ",
            "Verdict: again a test for water content only.",
          ],
        ],
      },
      {
        type: "image",
        src: blogImage(SLUG_PURE, "honey-watertest.webp"),
        alt: "Spoon of pure honey sinking in a glass of water during the water test",
        width: 1200,
        height: 800,
      },
      {
        type: "p",
        content: [
          "The honest truth: no home test can prove honey is pure. They can only catch very poor, watered-down honey. Smart adulteration passes all of them.",
        ],
      },
      { type: "h2", text: "Crystallization is not a sign of fake honey" },
      {
        type: "p",
        content: [
          "Many people throw away honey that turns solid or grainy in winter, thinking it is fake. In fact, crystallization (jam jana) is natural. Real honey is full of natural sugars, and many pure honeys crystallize in cold weather. Some, like certain Bari Makhi honeys, crystallize faster than others.",
        ],
      },
      {
        type: "p",
        content: [
          "To make it liquid again, place the closed jar in warm (not boiling) water for a few minutes. Never microwave it.",
        ],
      },
      {
        type: "image",
        src: blogImage(SLUG_PURE, "crystallized-honeynatural.webp"),
        alt: "Naturally crystallized honey in a jar next to liquid honey",
        width: 1200,
        height: 800,
      },
      { type: "h2", text: "What actually tells you honey is real" },
      {
        type: "ul",
        items: [
          [
            "Know the source. ",
            "Buy from sellers who can tell you the bee type and the region, such as Bari Makhi, Chhoti Makhi or Sidr (Beri) honey from Pakistan's forests.",
          ],
          [
            "Taste and smell. ",
            "Real wild honey has a clear floral aroma and a taste that changes from batch to batch. Sugar syrup tastes flat and only sweet.",
          ],
          [
            "A fair price. ",
            "Real wild honey cannot be sold cheaply. Compare prices before you trust a deal.",
          ],
          [
            "Lab testing. ",
            "The only reliable proof is a lab test for sugar profile and moisture. Ask your seller whether their honey has been tested.",
          ],
          [
            "Reviews from real customers. ",
            "Look for a business with genuine, verified reviews.",
          ],
        ],
      },
      { type: "h2", text: "Our honey at Al-Barakah" },
      {
        type: "p",
        content: [
          "At Al-Barakah, we sell three wild honeys, each from a known bee and source:",
        ],
      },
      {
        type: "ul",
        items: [
          [
            {
              type: "link",
              href: BLOG_PATHS.sidr,
              label: "Sidr (Beri) Wild Honey",
            },
            ": rich and full-bodied",
          ],
          [
            {
              type: "link",
              href: BLOG_PATHS.bariMakhi,
              label: "Bari Makhi (Apis mellifera) Honey",
            },
            ": smooth and golden, ideal for daily use",
          ],
          [
            {
              type: "link",
              href: BLOG_PATHS.chhotiMakhi,
              label: "Chhoti Makhi (Apis florea) Wild Honey",
            },
            ": rare, with a strong wild floral taste",
          ],
        ],
      },
      {
        type: "p",
        content: [
          "Not sure which to choose? Try the ",
          {
            type: "link",
            href: BLOG_PATHS.tasterTrio,
            label: "Taster Trio",
          },
          ", with ½ kg of each, and taste the difference yourself. All orders come with free delivery across Pakistan.",
        ],
      },
      { type: "h2", text: "Quick summary" },
      {
        type: "ul",
        items: [
          ["Home tests catch only very poor honey; they cannot prove purity."],
          ["Crystallized honey is normal, not fake."],
          ["Trust the source, the taste, a fair price and lab testing."],
        ],
      },
      {
        type: "p",
        content: [
          "Have a question about our honey? Message us on WhatsApp and we will gladly help.",
        ],
      },
    ],
  },
  {
    slug: SLUG_SIDR,
    title: "Sidr (Beri) Honey in Pakistan: Taste, Season and How to Buy",
    seoTitle: "Sidr (Beri) Honey in Pakistan: Taste, Season and How to Buy",
    metaDescription:
      "What is Sidr or Beri ka shahad? Learn where Sidr honey comes from, how it tastes, why it costs more, and how to buy real Sidr honey in Pakistan.",
    datePublished: "2026-10-29",
    featuredImage: {
      src: blogImage(SLUG_SIDR, "sidr-beri-honeypakistan.webp"),
      alt: "Al-Barakah Sidr (Beri) wild honey jar with beri tree branches",
      width: 1200,
      height: 630,
    },
    blocks: [
      {
        type: "p",
        content: [
          "Sidr honey, known in Urdu as beri ka shahad, is one of the most valued honeys in Pakistan and across the Muslim world. Many families keep a jar at home and buy it as a special gift. But what makes it different from regular honey, and how do you know you are getting the real thing?",
        ],
      },
      { type: "h2", text: "What is Sidr honey?" },
      {
        type: "p",
        content: [
          "Sidr honey comes from the nectar of the Sidr tree, called beri in Urdu (Ziziphus). These hardy trees grow across Punjab, Sindh and Khyber Pakhtunkhwa, often in dry areas where few other plants flower.",
        ],
      },
      {
        type: "image",
        src: blogImage(SLUG_SIDR, "beri-treeflowers.webp"),
        alt: "Beri (Sidr) tree flowers in bloom, the source of Sidr honey",
        width: 1200,
        height: 800,
      },
      {
        type: "p",
        content: [
          "The Sidr tree also holds a special place in Islamic tradition. The Quran mentions the sidr (lote) tree, including Sidrat al-Muntaha, which is one reason the honey is so respected in Muslim homes.",
        ],
      },
      { type: "h2", text: "When is Sidr honey made?" },
      {
        type: "p",
        content: [
          "Beri trees flower for a short window each year, usually from late summer into autumn. Bees can collect beri nectar only during this period, so each year's Sidr harvest is limited. This short season is the main reason Sidr honey costs more than everyday honey.",
        ],
      },
      { type: "h2", text: "What does Sidr honey taste like?" },
      {
        type: "p",
        content: ["Good Sidr honey is:"],
      },
      {
        type: "ul",
        items: [
          ["Thick and rich, darker than most everyday honey"],
          ["Deep in flavour, often described as warm and slightly caramel-like"],
          ["Smooth, with a pleasant aftertaste that is not just sweet"],
        ],
      },
      {
        type: "p",
        content: [
          "Its taste can change slightly from season to season, because it is a natural product.",
        ],
      },
      { type: "h2", text: "Why is Sidr honey more expensive?" },
      {
        type: "ul",
        items: [
          ["Short flowering season: bees can only make it for a few weeks a year."],
          [
            "Wild collection: much Sidr honey comes from wild or semi-wild hives, not large farms.",
          ],
          [
            "High demand: it is a favourite gift, especially for Ramadan, Eid and weddings.",
          ],
        ],
      },
      {
        type: "p",
        content: [
          'Because of its price, Sidr is also one of the most commonly faked honeys. A very cheap "Sidr honey" is a red flag.',
        ],
      },
      { type: "h2", text: "How people use Sidr honey" },
      {
        type: "p",
        content: ["Most families enjoy Sidr honey simply:"],
      },
      {
        type: "ul",
        items: [
          ["A spoonful on its own, or in warm water in the morning"],
          ["Drizzled over yogurt, roti or porridge"],
          ["In Talbina, the traditional Sunnah barley dish"],
          ["As a gift in a premium box"],
        ],
      },
      {
        type: "image",
        src: blogImage(SLUG_SIDR, "sidr-honey-spoonclose-up.webp"),
        alt: "Thick dark Sidr honey dripping from a wooden honey dipper",
        width: 1200,
        height: 800,
      },
      {
        type: "p",
        content: [
          "Note: honey is not suitable for babies under one year old.",
        ],
      },
      { type: "h2", text: "How to buy real Sidr honey" },
      {
        type: "ol",
        items: [
          [
            "Ask about the source: a genuine seller will tell you it comes from beri blossoms and from which region.",
          ],
          [
            "Check the price: real Sidr cannot be sold at the price of ordinary honey.",
          ],
          [
            "Look at texture and taste: it should be thick with a deep flavour, not thin and plain sweet.",
          ],
          [
            "Buy from a seller with real reviews, not anonymous listings.",
          ],
        ],
      },
      {
        type: "p",
        content: [
          "For more tips, read our guide on ",
          {
            type: "link",
            href: BLOG_SLUGS.pureHoney,
            label: "how to identify pure honey",
          },
          ".",
        ],
      },
      { type: "h2", text: "Al-Barakah Sidr (Beri) Wild Honey" },
      {
        type: "p",
        content: [
          "Our ",
          {
            type: "link",
            href: BLOG_PATHS.sidr,
            label: "Sidr (Beri) Wild Honey",
          },
          " is collected by small wild bees (chhoti makhi) from beri blossoms. It comes in ½ kg and 1 kg jars, with free delivery across Pakistan.",
        ],
      },
      {
        type: "p",
        content: [
          "Want to pair it with another honey? Try the ",
          {
            type: "link",
            href: BLOG_PATHS.healthDuo,
            label: "Health Duo (Sidr + Bari Makhi)",
          },
          " or the ",
          {
            type: "link",
            href: BLOG_PATHS.giftBoxDeluxe,
            label: "Gift Box Deluxe",
          },
          ", which has all three of our wild honeys.",
        ],
      },
      {
        type: "p",
        content: [
          "Questions about Sidr honey? Message us on WhatsApp anytime.",
        ],
      },
    ],
  },
  {
    slug: SLUG_BARI,
    title: "Bari Makhi vs Chhoti Makhi Ka Shahad: What's the Difference?",
    seoTitle: "Bari Makhi vs Chhoti Makhi Ka Shahad: What's the Difference?",
    metaDescription:
      "Bari makhi ya chhoti makhi ka shahad, which is better? Compare taste, texture, rarity and price of Apis mellifera and Apis florea honey in Pakistan.",
    datePublished: "2026-10-29",
    featuredImage: {
      src: blogImage(SLUG_BARI, "bari-makhi-vschhoti-makhihoney.webp"),
      alt: "Bari Makhi and Chhoti Makhi honey jars side by side for comparison",
      width: 1200,
      height: 630,
    },
    blocks: [
      {
        type: "p",
        content: [
          "In Pakistan, honey is often sold as bari makhi ka shahad or chhoti makhi ka shahad. Both are real honey, but they come from different bees, taste different and are priced differently. Here is a simple guide to help you choose.",
        ],
      },
      { type: "h2", text: "Meet the bees" },
      {
        type: "h3",
        text: "Bari Makhi (Apis mellifera)",
      },
      {
        type: "p",
        content: [
          "The larger honeybee, kept by beekeepers in wooden boxes. Because the hives are managed and moved to flowering areas, these bees produce honey in larger amounts and with a steady quality.",
        ],
      },
      {
        type: "h3",
        text: "Chhoti Makhi (Apis florea)",
      },
      {
        type: "p",
        content: [
          "A small wild bee, also called the dwarf honeybee. It does not live in boxes. It builds a single small comb out in the open, hanging from bushes and tree branches. Each comb holds only a little honey, and it must be found and collected from the wild.",
        ],
      },
      {
        type: "image",
        src: blogImage(SLUG_BARI, "apis-florea-wildhoneycomb.webp"),
        alt: "Chhoti makhi (Apis florea) wild honeycomb hanging from a tree branch",
        width: 1200,
        height: 800,
      },
      { type: "h2", text: "Side-by-side comparison" },
      {
        type: "table",
        headers: ["", "Bari Makhi honey", "Chhoti Makhi honey"],
        rows: [
          ["Bee", "Apis mellifera (large)", "Apis florea (small, wild)"],
          ["Source", "Managed hives", "Wild combs on bushes and trees"],
          ["Amount per hive", "Large", "Very small"],
          ["Taste", "Smooth, mild, golden", "Strong, wild, floral"],
          ["Rarity", "Widely available", "Rare"],
          ["Price", "More affordable", "Higher"],
          ["Best for", "Everyday use", "Special use and gifting"],
        ],
      },
      { type: "h2", text: "Taste and texture" },
      {
        type: "p",
        content: [
          "Bari Makhi honey is smooth and mild, with a familiar golden sweetness. It is easy to enjoy every day in tea, warm water, on toast or with breakfast. Many types crystallize (jam jana) in winter, which is completely natural.",
        ],
      },
      {
        type: "p",
        content: [
          'Chhoti Makhi honey has a stronger, more complex taste. Because the small bees forage on wild plants, the flavour can be floral, slightly tangy and different from batch to batch. People who grew up with village honey often say it tastes like "purana desi shahad".',
        ],
      },
      {
        type: "image",
        src: blogImage(SLUG_BARI, "bari-chhoti-honeycolourcomparison.webp"),
        alt: "Two spoons showing the colour difference between Bari and Chhoti Makhi honey",
        width: 1200,
        height: 800,
      },
      { type: "h2", text: "Why is Chhoti Makhi honey more expensive?" },
      {
        type: "ul",
        items: [
          ["Each wild comb gives only a small amount of honey."],
          ["Combs must be found in the wild; they cannot be farmed in boxes."],
          ["Supply depends on the season and weather."],
        ],
      },
      {
        type: "p",
        content: [
          "This rarity, not marketing, is why Chhoti Makhi honey costs more.",
        ],
      },
      { type: "h2", text: "Which one should you buy?" },
      {
        type: "ul",
        items: [
          [
            "For daily family use: Bari Makhi honey gives great value and a pleasant, mild taste.",
          ],
          ["For a rare, traditional taste: choose Chhoti Makhi honey."],
          ["Can't decide? Get both and compare."],
        ],
      },
      {
        type: "p",
        content: [
          "And if you want a third option, read about ",
          {
            type: "link",
            href: BLOG_SLUGS.sidrGuide,
            label: "Sidr (Beri) honey",
          },
          ", the most prized of all.",
        ],
      },
      { type: "h2", text: "Shop at Al-Barakah" },
      {
        type: "ul",
        items: [
          [
            {
              type: "link",
              href: BLOG_PATHS.bariMakhi,
              label: "Bari Makhi (Apis mellifera) Honey",
            },
            ", ½ kg and 1 kg",
          ],
          [
            {
              type: "link",
              href: BLOG_PATHS.chhotiMakhi,
              label: "Chhoti Makhi (Apis florea) Wild Honey",
            },
            ", ½ kg and 1 kg",
          ],
          [
            {
              type: "link",
              href: BLOG_PATHS.wellnessDuo,
              label: "Wellness Duo",
            },
            ": ½ kg Bari Makhi + ½ kg Chhoti Makhi, the easiest way to taste both",
          ],
          [
            {
              type: "link",
              href: BLOG_PATHS.powerPair,
              label: "Power Pair",
            },
            ": 1 kg of each, for families",
          ],
        ],
      },
      {
        type: "p",
        content: [
          "All orders come with free delivery across Pakistan.",
        ],
      },
      {
        type: "p",
        content: [
          "Still unsure which honey suits you? Message us on WhatsApp and we will help you choose.",
        ],
      },
    ],
  },
  {
    slug: SLUG_TALBINA,
    title: "Talbina Recipe with Honey: Easy Sunnah Barley Dish at Home",
    seoTitle: "Talbina Recipe with Honey: Easy Sunnah Barley Dish at Home",
    metaDescription:
      "Make Talbina at home in 15 minutes with barley flour, milk and pure honey. A simple Sunnah recipe, step by step, with tips and variations.",
    datePublished: "2026-10-29",
    featuredImage: {
      src: blogImage(SLUG_TALBINA, "talbina-recipe-withhoney.webp"),
      alt: "Bowl of Talbina barley porridge topped with honey, dates and almonds",
      width: 1200,
      height: 630,
    },
    blocks: [
      {
        type: "p",
        content: [
          "Talbina is a warm, soft barley porridge with a special place in the Sunnah. It is simple, filling and comforting, and it takes only 15 minutes to make. Sweetened with pure honey, it becomes a wholesome breakfast or evening dish for the whole family.",
        ],
      },
      { type: "h2", text: "What is Talbina?" },
      {
        type: "p",
        content: [
          "Talbina is made by cooking barley flour (jau ka atta) in milk or water until it becomes smooth and creamy. Its name comes from the Arabic word laban (milk), because of its soft, milky look.",
        ],
      },
      {
        type: "p",
        content: [
          "In Sahih al-Bukhari, Aisha (RA) narrated that the Prophet (peace be upon him) recommended Talbina, saying it brings comfort to the heart of the sick and eases some of their sorrow. Ever since, Muslim families have prepared it for loved ones who are unwell or grieving, and as a simple, blessed food at home.",
        ],
      },
      { type: "h2", text: "Ingredients (1 serving)" },
      {
        type: "ul",
        items: [
          ["2 tablespoons barley flour (jau ka atta)"],
          ["1 cup milk (or water, for a lighter version)"],
          ["1 to 2 teaspoons pure honey"],
          [
            "Optional: 2 to 3 chopped dates, a pinch of cardamom, chopped almonds or walnuts",
          ],
        ],
      },
      {
        type: "image",
        src: blogImage(SLUG_TALBINA, "talbina-ingredientsbarley-honey.webp"),
        alt: "Talbina ingredients: barley flour, milk, pure honey and dates",
        width: 1200,
        height: 800,
      },
      { type: "h2", text: "How to make Talbina" },
      {
        type: "ol",
        items: [
          [
            "Mix: In a small pan, stir the barley flour into the cold milk until there are no lumps.",
          ],
          ["Cook: Put the pan on low heat. Keep stirring so it does not stick."],
          [
            "Thicken: Cook for 10 to 15 minutes, until it becomes thick and creamy, like a soft porridge.",
          ],
          [
            "Cool slightly: Take it off the heat and let it cool for a minute or two.",
          ],
          [
            "Add honey: Stir in the honey once the Talbina is warm, not boiling. This keeps the honey's natural taste and aroma.",
          ],
          [
            "Serve: Top with dates, nuts or a pinch of cardamom and enjoy warm.",
          ],
        ],
      },
      {
        type: "image",
        src: blogImage(SLUG_TALBINA, "cooking-talbina-inpan.webp"),
        alt: "Stirring barley flour and milk in a pan to make Talbina",
        width: 1200,
        height: 800,
      },
      { type: "h2", text: "Tips for the best Talbina" },
      {
        type: "ul",
        items: [
          ["Stir often. Barley flour thickens quickly and can stick to the pan."],
          ["Too thick? Add a little more milk. Too thin? Cook a few minutes longer."],
          ["Don't boil the honey. Add it at the end for the best flavour."],
          [
            "Make it ahead: Talbina can be kept in the fridge for a day. Warm it gently and add honey just before serving.",
          ],
        ],
      },
      { type: "h2", text: "Which honey is best for Talbina?" },
      {
        type: "p",
        content: ["Any pure honey works, but each one gives a different taste:"],
      },
      {
        type: "ul",
        items: [
          [
            {
              type: "link",
              href: BLOG_PATHS.bariMakhi,
              label: "Bari Makhi Honey",
            },
            ": mild and smooth, great for everyday Talbina and for children over one year",
          ],
          [
            {
              type: "link",
              href: BLOG_PATHS.sidr,
              label: "Sidr (Beri) Wild Honey",
            },
            ": rich and deep, for a special, more luxurious bowl",
          ],
          [
            {
              type: "link",
              href: BLOG_PATHS.chhotiMakhi,
              label: "Chhoti Makhi Wild Honey",
            },
            ": bold and floral, for those who love a strong honey taste",
          ],
        ],
      },
      {
        type: "p",
        content: [
          "New to these honeys? Our ",
          {
            type: "link",
            href: BLOG_PATHS.tasterTrio,
            label: "Taster Trio",
          },
          " gives you ½ kg of all three so you can find your favourite. Want to learn more first? Read ",
          {
            type: "link",
            href: BLOG_SLUGS.bariVsChhoti,
            label: "Bari Makhi vs Chhoti Makhi honey",
          },
          ".",
        ],
      },
      {
        type: "p",
        content: [
          "Note: honey should not be given to babies under one year old.",
        ],
      },
      {
        type: "p",
        content: [
          "All Al-Barakah orders come with free delivery across Pakistan. Have a question? Message us on WhatsApp.",
        ],
      },
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllPostSlugs(): string[] {
  return posts.map((p) => p.slug);
}
