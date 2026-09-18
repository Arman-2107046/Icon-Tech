// Seeds 60 customers with addresses. Filled in by item 27.

import { db } from "../../src/lib/db";
import { daysAgo, int, pick, rng, slug } from "./util";

const FIRST_NAMES = [
  "Ayesha", "Tanvir", "Nusrat", "Rafiq", "Sadia", "Imran", "Farhana", "Mahmud",
  "Rahim", "Tasnim", "Arif", "Jannat", "Sakib", "Maliha", "Fahim", "Nabila",
  "Shakil", "Rumana", "Kamal", "Sumaiya", "Zahid", "Anika", "Rakib", "Mehjabin",
  "Hasan", "Priya", "Nafis", "Tahmina", "Omar", "Lamia",
];

const LAST_NAMES = [
  "Rahman", "Ahmed", "Hossain", "Islam", "Chowdhury", "Khan", "Akter", "Karim",
  "Sarker", "Uddin", "Haque", "Siddique", "Mahmud", "Bhuiyan", "Talukder", "Das",
];

const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com", "proton.me"];

type City = { city: string; region: string; areas: string[]; postal: string[] };

const CITIES: City[] = [
  {
    city: "Dhaka",
    region: "Dhaka",
    areas: ["Gulshan 2", "Banani", "Dhanmondi", "Uttara Sector 7", "Mirpur DOHS", "Bashundhara R/A", "Mohammadpur", "Baridhara"],
    postal: ["1212", "1213", "1209", "1230", "1216", "1229", "1207", "1212"],
  },
  {
    city: "Chattogram",
    region: "Chattogram",
    areas: ["Nasirabad", "Khulshi", "Agrabad", "Halishahar"],
    postal: ["4000", "4225", "4100", "4216"],
  },
  { city: "Sylhet", region: "Sylhet", areas: ["Zindabazar", "Ambarkhana", "Uposhohor"], postal: ["3100", "3100", "3100"] },
  { city: "Rajshahi", region: "Rajshahi", areas: ["Shaheb Bazar", "Padma R/A"], postal: ["6100", "6000"] },
  { city: "Khulna", region: "Khulna", areas: ["Sonadanga", "Boyra"], postal: ["9100", "9000"] },
];

const STREETS = ["Road", "Lane", "Avenue"];

function address(random: () => number, firstName: string, lastName: string) {
  // Weight Dhaka heavily: most orders ship inside the capital.
  const city = random() < 0.62 ? CITIES[0] : pick(random, CITIES.slice(1));
  if (!city) throw new Error("seed: no city");
  const areaIndex = int(random, 0, city.areas.length - 1);
  const house = int(random, 1, 120);
  const road = int(random, 1, 27);
  const flat = random() < 0.6 ? `Flat ${pick(random, ["A", "B", "C", "D"])}${int(random, 1, 8)}, ` : "";
  return {
    firstName,
    lastName,
    line1: `${flat}House ${house}, ${pick(random, STREETS)} ${road}`,
    line2: city.areas[areaIndex] ?? null,
    city: city.city,
    region: city.region,
    postalCode: city.postal[areaIndex] ?? null,
    country: "BD",
    phone: `+8801${pick(random, ["3", "5", "6", "7", "8", "9"])}${String(int(random, 10000000, 99999999))}`,
  };
}

export async function seedCustomers(): Promise<void> {
  const random = rng(27);
  const usedEmails = new Set<string>();

  for (let i = 0; i < 60; i++) {
    const firstName = pick(random, FIRST_NAMES);
    const lastName = pick(random, LAST_NAMES);
    let email = `${slug(firstName)}.${slug(lastName)}@${pick(random, EMAIL_DOMAINS)}`;
    for (let n = 2; usedEmails.has(email); n++) {
      email = `${slug(firstName)}.${slug(lastName)}${n}@${pick(random, EMAIL_DOMAINS)}`;
    }
    usedEmails.add(email);

    const primary = address(random, firstName, lastName);
    const extra = random() < 0.3 ? [address(random, firstName, lastName)] : [];

    await db.customer.create({
      data: {
        email,
        firstName,
        lastName,
        phone: primary.phone,
        acceptsMarketing: random() < 0.55,
        createdAt: daysAgo(int(random, 0, 400), int(random, 8, 23)),
        addresses: {
          create: [
            { ...primary, isDefault: true },
            ...extra.map((a) => ({ ...a, isDefault: false })),
          ],
        },
      },
    });
  }
}
