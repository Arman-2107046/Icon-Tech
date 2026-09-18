// Seeds 5 collections, 3 manual and 2 rule-based. Filled in by item 26.

import { db } from "../../src/lib/db";
import { imageUrl } from "./util";

type ManualCollection = {
  handle: string;
  title: string;
  description: string;
  productHandles: string[];
};

/** Shape stored in Collection.rules; resolved by the catalog module (item 43). */
type CollectionRules = {
  match: "all" | "any";
  conditions: {
    field: "tag" | "vendor" | "price" | "title" | "compare_at_price";
    operator: "equals" | "not_equals" | "contains" | "gt" | "lt" | "is_set";
    value: string | number;
  }[];
};

type RuleCollection = {
  handle: string;
  title: string;
  description: string;
  rules: CollectionRules;
};

const MANUAL: ManualCollection[] = [
  {
    handle: "new-arrivals",
    title: "New Arrivals",
    description:
      "The latest additions to the shelf, from the Keystone 75 to the Volt 140 W charger.",
    productHandles: [
      "keystone-75-mechanical-keyboard",
      "volt-gan-charger",
      "aria-anc-headphones",
      "plinth-monitor-arm",
      "porter-tech-backpack",
      "fieldline-webcam",
      "glide-pro-mouse",
      "volt-magsafe-stand",
    ],
  },
  {
    handle: "desk-setup-essentials",
    title: "Desk Setup Essentials",
    description:
      "Everything between the wall socket and your hands: stands, hubs, boards, mats, and the light you work by.",
    productHandles: [
      "plinth-laptop-stand",
      "plinth-usb-c-hub",
      "keystone-low-profile",
      "glide-desk-mat",
      "plinth-desk-lamp",
      "plinth-headphone-stand",
      "monolith-desk-speaker",
      "fieldline-boom-arm",
      "glide-ergonomic-mouse",
    ],
  },
  {
    handle: "gifts-under-5000",
    title: "Gifts Under ৳5,000",
    description:
      "Small, well-made things that people actually use every day.",
    productHandles: [
      "monolith-go-speaker",
      "volt-travel-adapter",
      "porter-tech-pouch",
      "tempo-tracker-tag",
      "shell-earbud-case-cover",
      "volt-cable-organiser",
      "aria-dac-dongle",
      "plinth-headphone-stand",
    ],
  },
];

const RULE: RuleCollection[] = [
  {
    handle: "audio",
    title: "Audio",
    description:
      "Headphones, earbuds, speakers, and the microphones that make you sound as good as you hear.",
    rules: {
      match: "all",
      conditions: [{ field: "tag", operator: "equals", value: "audio" }],
    },
  },
  {
    handle: "sale",
    title: "Sale",
    description: "Reduced prices on current stock. No seconds, no last-season leftovers.",
    rules: {
      match: "all",
      conditions: [{ field: "compare_at_price", operator: "is_set", value: "" }],
    },
  },
];

export async function seedCollections(): Promise<void> {
  for (const c of MANUAL) {
    const products = await db.product.findMany({
      where: { handle: { in: c.productHandles } },
      select: { id: true, handle: true },
    });
    const idByHandle = new Map(products.map((p) => [p.handle, p.id]));

    await db.collection.create({
      data: {
        handle: c.handle,
        title: c.title,
        description: c.description,
        type: "MANUAL",
        imageUrl: imageUrl(`collection-${c.handle}`, 1600, 900),
        seoTitle: `${c.title} | Icon Tech`,
        seoDescription: c.description,
        products: {
          create: c.productHandles.flatMap((handle, position) => {
            const productId = idByHandle.get(handle);
            if (!productId) throw new Error(`seed: unknown product handle ${handle}`);
            return [{ productId, position }];
          }),
        },
      },
    });
  }

  for (const c of RULE) {
    await db.collection.create({
      data: {
        handle: c.handle,
        title: c.title,
        description: c.description,
        type: "RULE",
        rules: c.rules,
        imageUrl: imageUrl(`collection-${c.handle}`, 1600, 900),
        seoTitle: `${c.title} | Icon Tech`,
        seoDescription: c.description,
      },
    });
  }
}
