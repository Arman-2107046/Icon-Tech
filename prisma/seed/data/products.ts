/**
 * Demo catalogue for a premium tech-accessories store. Prices are BDT major
 * units and are converted to minor units by the seeder. `priceDelta` adds
 * a per-option-value surcharge (e.g. larger capacity costs more).
 */

export type SeedProductStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";

export type SeedProduct = {
  handle: string;
  title: string;
  vendor: string;
  tags: string[];
  description: string;
  price: number;
  compareAt?: number;
  status?: SeedProductStatus;
  options: { name: string; values: string[] }[];
  priceDelta?: Record<string, number>;
  weightGrams?: number;
  images?: number;
};

const COLOURS_3 = ["Graphite", "Silver", "Midnight Blue"];
const COLOURS_CASE = ["Black", "Forest Green", "Sand", "Lavender"];
const PHONES = ["iPhone 16", "iPhone 16 Pro", "iPhone 16 Pro Max", "Pixel 9", "Galaxy S25"];

export const PRODUCTS: SeedProduct[] = [
  // ---- Audio ---------------------------------------------------------------
  {
    handle: "aria-anc-headphones",
    title: "Aria Active Noise-Cancelling Headphones",
    vendor: "Aria Audio",
    tags: ["audio", "headphones", "wireless", "anc", "featured"],
    description:
      "Over-ear headphones with hybrid noise cancelling and 40-hour battery life. Memory-foam cushions wrapped in protein leather, a folding aluminium frame, and multipoint Bluetooth so you can stay paired to a laptop and a phone at the same time.",
    price: 18500,
    compareAt: 21000,
    options: [{ name: "Colour", values: COLOURS_3 }],
    weightGrams: 260,
  },
  {
    handle: "aria-buds-pro",
    title: "Aria Buds Pro",
    vendor: "Aria Audio",
    tags: ["audio", "earbuds", "wireless", "anc"],
    description:
      "True-wireless earbuds with adaptive noise cancelling and an IPX5 rating for commutes in the rain. Six hours per charge, thirty with the case, and a low-latency mode for video calls.",
    price: 9800,
    options: [{ name: "Colour", values: ["Black", "White"] }],
    weightGrams: 52,
  },
  {
    handle: "aria-sport-buds",
    title: "Aria Sport Buds",
    vendor: "Aria Audio",
    tags: ["audio", "earbuds", "wireless", "sport"],
    description:
      "Ear-hook earbuds that stay put through interval sessions. IP67 sweat and dust resistance, a physical volume rocker you can find without looking, and a fast charge that gives an hour of playback in five minutes.",
    price: 6200,
    options: [{ name: "Colour", values: ["Black", "Volt"] }],
    weightGrams: 60,
  },
  {
    handle: "monolith-desk-speaker",
    title: "Monolith Desk Speaker",
    vendor: "Monolith",
    tags: ["audio", "speaker", "desk"],
    description:
      "A single-piece anodised aluminium speaker with a 2.1 driver array tuned for near-field listening. Bluetooth 5.3, USB-C audio in, and a top-mounted volume dial with a satisfying detent.",
    price: 14500,
    options: [{ name: "Finish", values: ["Space Grey", "Silver"] }],
    weightGrams: 1200,
  },
  {
    handle: "monolith-go-speaker",
    title: "Monolith Go Portable Speaker",
    vendor: "Monolith",
    tags: ["audio", "speaker", "portable", "gift"],
    description:
      "A palm-sized speaker with a woven fabric grille and a 14-hour battery. IP67 rated, floats if dropped in a pool, and pairs with a second unit for stereo.",
    price: 5400,
    compareAt: 6500,
    options: [{ name: "Colour", values: ["Charcoal", "Sage", "Terracotta"] }],
    weightGrams: 380,
  },
  {
    handle: "studio-usb-microphone",
    title: "Studio USB Condenser Microphone",
    vendor: "Fieldline",
    tags: ["audio", "microphone", "creator"],
    description:
      "A large-diaphragm condenser mic with a built-in pop filter and a tap-to-mute cap that lights red so you always know when you're live. Plug-and-play over USB-C with zero-latency headphone monitoring.",
    price: 11200,
    options: [{ name: "Colour", values: ["Black", "Silver"] }],
    weightGrams: 540,
  },
  {
    handle: "fieldline-boom-arm",
    title: "Fieldline Low-Profile Boom Arm",
    vendor: "Fieldline",
    tags: ["audio", "microphone", "desk", "creator"],
    description:
      "A desk-clamped arm that sits below camera line and swings out silently on sealed bearings. Hidden cable channel, 3/8-inch and 5/8-inch threads, and a 1.5 kg payload for heavy dynamic mics.",
    price: 7800,
    options: [{ name: "Colour", values: ["Black"] }],
    weightGrams: 1300,
  },
  {
    handle: "aria-dac-dongle",
    title: "Aria Hi-Res USB-C DAC",
    vendor: "Aria Audio",
    tags: ["audio", "dac", "cable"],
    description:
      "A thumb-sized DAC and headphone amp that turns any USB-C port into a proper 3.5 mm output. Drives 300-ohm headphones, decodes up to 32-bit/384 kHz, and has a braided lead that won't fray at the strain relief.",
    price: 3900,
    options: [{ name: "Colour", values: ["Graphite", "Silver"] }],
    weightGrams: 12,
  },

  // ---- Keyboards & mice ----------------------------------------------------
  {
    handle: "keystone-75-mechanical-keyboard",
    title: "Keystone 75 Mechanical Keyboard",
    vendor: "Keystone",
    tags: ["keyboard", "mechanical", "desk", "featured"],
    description:
      "A 75% gasket-mounted board with a CNC aluminium case, hot-swap sockets, and PBT dye-sub keycaps. Tri-mode connectivity over 2.4 GHz, Bluetooth, and USB-C, with a rotary knob for volume.",
    price: 16800,
    options: [
      { name: "Switch", values: ["Linear", "Tactile", "Silent Linear"] },
      { name: "Colour", values: ["Charcoal", "Ivory"] },
    ],
    priceDelta: { "Silent Linear": 900 },
    weightGrams: 1100,
  },
  {
    handle: "keystone-mini-60",
    title: "Keystone Mini 60",
    vendor: "Keystone",
    tags: ["keyboard", "mechanical", "portable"],
    description:
      "A 60% layout in a polycarbonate case that lets the RGB glow through. Hot-swap, wireless, and light enough to live in a backpack alongside a laptop.",
    price: 9500,
    compareAt: 11000,
    options: [
      { name: "Switch", values: ["Linear", "Tactile"] },
      { name: "Colour", values: ["Frost", "Smoke"] },
    ],
    weightGrams: 620,
  },
  {
    handle: "keystone-low-profile",
    title: "Keystone Low-Profile Wireless Keyboard",
    vendor: "Keystone",
    tags: ["keyboard", "wireless", "desk", "mac"],
    description:
      "A slim scissor-switch keyboard with a full-height function row and a numpad. Pairs with three devices and switches between them with a single key.",
    price: 7200,
    options: [{ name: "Layout", values: ["Mac", "Windows"] }],
    weightGrams: 480,
  },
  {
    handle: "glide-ergonomic-mouse",
    title: "Glide Ergonomic Vertical Mouse",
    vendor: "Glide",
    tags: ["mouse", "ergonomic", "wireless", "desk"],
    description:
      "A 57-degree vertical mouse that keeps your forearm in a handshake position. Silent switches, a 4,000 DPI sensor, and a USB-C rechargeable battery good for three months.",
    price: 5600,
    options: [
      { name: "Size", values: ["Medium", "Large"] },
      { name: "Hand", values: ["Right", "Left"] },
    ],
    weightGrams: 110,
  },
  {
    handle: "glide-pro-mouse",
    title: "Glide Pro Wireless Mouse",
    vendor: "Glide",
    tags: ["mouse", "wireless", "desk", "featured"],
    description:
      "A low-slung productivity mouse with an infinite-scroll wheel that free-spins through long documents. Tracks on glass, pairs with three devices, and charges over USB-C.",
    price: 8400,
    options: [{ name: "Colour", values: ["Graphite", "Pale Grey", "Rose"] }],
    weightGrams: 140,
  },
  {
    handle: "glide-desk-mat",
    title: "Glide Desk Mat",
    vendor: "Glide",
    tags: ["desk", "mat", "gift"],
    description:
      "A stitched-edge desk mat in a tight-weave fabric that mice glide across and coffee wipes off. Non-slip rubber base with rolled-flat memory so it lies flat straight out of the box.",
    price: 2400,
    options: [
      { name: "Size", values: ["Medium (80 × 30 cm)", "Large (90 × 40 cm)", "XL (120 × 60 cm)"] },
      { name: "Colour", values: ["Charcoal", "Sand", "Olive"] },
    ],
    priceDelta: { "Large (90 × 40 cm)": 600, "XL (120 × 60 cm)": 1400 },
    weightGrams: 700,
  },

  // ---- Charging & cables ---------------------------------------------------
  {
    handle: "volt-gan-charger",
    title: "Volt GaN Charger",
    vendor: "Volt",
    tags: ["charging", "charger", "gan", "travel", "featured"],
    description:
      "A gallium-nitride wall charger that's half the size of the brick that came with your laptop. Folding prongs, intelligent power split across ports, and full-speed PD 3.1 on the first USB-C port.",
    price: 3200,
    options: [{ name: "Wattage", values: ["45W", "65W", "100W", "140W"] }],
    priceDelta: { "65W": 900, "100W": 2300, "140W": 3800 },
    weightGrams: 120,
  },
  {
    handle: "volt-power-bank",
    title: "Volt Power Bank",
    vendor: "Volt",
    tags: ["charging", "power-bank", "travel"],
    description:
      "A flight-safe power bank with a built-in USB-C cable that tucks into the shell. Digital charge readout on the face, pass-through charging, and 65 W output that keeps a laptop going.",
    price: 4900,
    options: [
      { name: "Capacity", values: ["10,000 mAh", "20,000 mAh"] },
      { name: "Colour", values: ["Black", "White"] },
    ],
    priceDelta: { "20,000 mAh": 2100 },
    weightGrams: 220,
  },
  {
    handle: "volt-magsafe-stand",
    title: "Volt 3-in-1 Magnetic Charging Stand",
    vendor: "Volt",
    tags: ["charging", "magsafe", "desk", "gift"],
    description:
      "One stand for phone, watch, and earbuds, cast in a single zinc-alloy arm with a weighted base. The phone pad tilts for StandBy mode and the whole thing runs off the included 40 W adapter.",
    price: 8900,
    compareAt: 9900,
    options: [{ name: "Colour", values: ["Black", "White"] }],
    weightGrams: 560,
  },
  {
    handle: "volt-braided-usb-c-cable",
    title: "Volt Braided USB-C Cable",
    vendor: "Volt",
    tags: ["cable", "usb-c", "charging"],
    description:
      "A 240 W-rated USB-C cable in a tight nylon braid with aluminium connector housings and a silicone tie sewn into the collar. Rated for 30,000 bends.",
    price: 950,
    options: [
      { name: "Length", values: ["1 m", "2 m", "3 m"] },
      { name: "Colour", values: ["Black", "Grey"] },
    ],
    priceDelta: { "2 m": 300, "3 m": 650 },
    weightGrams: 40,
  },
  {
    handle: "volt-usb-c-lightning-cable",
    title: "Volt USB-C to Lightning Cable",
    vendor: "Volt",
    tags: ["cable", "lightning", "charging"],
    description:
      "MFi-certified Lightning cable with the same braid and connector housings as our USB-C line. Fast-charges older iPhones and AirPods cases.",
    price: 1400,
    options: [{ name: "Length", values: ["1 m", "2 m"] }],
    priceDelta: { "2 m": 300 },
    weightGrams: 35,
  },
  {
    handle: "volt-car-charger",
    title: "Volt Car Charger",
    vendor: "Volt",
    tags: ["charging", "charger", "car", "travel"],
    description:
      "A flush-fit car charger with one USB-C PD port and one USB-A, sharing 48 W. A soft-glow ring helps you find the port in the dark without lighting up the cabin.",
    price: 1800,
    options: [{ name: "Colour", values: ["Black"] }],
    weightGrams: 30,
  },
  {
    handle: "volt-travel-adapter",
    title: "Volt Universal Travel Adapter",
    vendor: "Volt",
    tags: ["charging", "travel", "adapter", "gift"],
    description:
      "Covers outlets in 200 countries with sliding pins and a 65 W GaN charger built in. Two USB-C and one USB-A port on the face, plus a replaceable fuse.",
    price: 4200,
    options: [{ name: "Colour", values: ["Black", "White"] }],
    weightGrams: 210,
  },
  {
    handle: "volt-cable-organiser",
    title: "Volt Cable Organiser Pouch",
    vendor: "Volt",
    tags: ["travel", "organiser", "gift"],
    description:
      "A structured pouch with elastic loops for cables, a zip pocket for adapters, and a mesh sleeve for a power bank. Water-resistant shell in recycled polyester.",
    price: 1900,
    options: [
      { name: "Size", values: ["Small", "Large"] },
      { name: "Colour", values: ["Black", "Olive", "Navy"] },
    ],
    priceDelta: { Large: 700 },
    weightGrams: 150,
  },

  // ---- Cases & protection --------------------------------------------------
  {
    handle: "shell-silicone-case",
    title: "Shell Silicone Phone Case",
    vendor: "Shell",
    tags: ["case", "phone", "magsafe"],
    description:
      "A liquid-silicone case with a microfibre lining and a magnet ring for wireless charging and accessories. Raised lips around the camera and screen, and buttons that still click.",
    price: 2200,
    options: [
      { name: "Model", values: PHONES },
      { name: "Colour", values: COLOURS_CASE },
    ],
    weightGrams: 40,
  },
  {
    handle: "shell-leather-case",
    title: "Shell Full-Grain Leather Case",
    vendor: "Shell",
    tags: ["case", "phone", "leather", "magsafe", "gift"],
    description:
      "Vegetable-tanned full-grain leather over a slim polycarbonate shell. It starts matte and develops a patina within weeks. Magnet ring inside, machined aluminium buttons outside.",
    price: 4800,
    options: [
      { name: "Model", values: PHONES.slice(0, 3) },
      { name: "Colour", values: ["Tan", "Black", "Oxblood"] },
    ],
    weightGrams: 50,
  },
  {
    handle: "shell-clear-case",
    title: "Shell Clear Case",
    vendor: "Shell",
    tags: ["case", "phone", "magsafe"],
    description:
      "A crystal-clear case with an anti-yellowing coating and a magnet ring you can see through. Shock-absorbing corners rated for 3 m drops.",
    price: 1600,
    options: [{ name: "Model", values: PHONES }],
    weightGrams: 35,
  },
  {
    handle: "shell-screen-protector",
    title: "Shell Tempered Glass Screen Protector",
    vendor: "Shell",
    tags: ["screen-protector", "phone"],
    description:
      "9H tempered glass with an oleophobic coating and an alignment tray so you get it straight first time. Two in the box.",
    price: 900,
    options: [{ name: "Model", values: PHONES }],
    weightGrams: 20,
  },
  {
    handle: "shell-laptop-sleeve",
    title: "Shell Laptop Sleeve",
    vendor: "Shell",
    tags: ["laptop", "sleeve", "bag"],
    description:
      "A wool-felt sleeve with a magnetic flap and a leather pull tab. Fits snugly so the laptop doesn't slide, with a flat pocket for a charger.",
    price: 3400,
    options: [
      { name: "Size", values: ['13"', '14"', '16"'] },
      { name: "Colour", values: ["Charcoal", "Oat"] },
    ],
    priceDelta: { '14"': 200, '16"': 500 },
    weightGrams: 250,
  },
  {
    handle: "shell-earbud-case-cover",
    title: "Shell Earbud Case Cover",
    vendor: "Shell",
    tags: ["case", "earbuds", "gift"],
    description:
      "A silicone cover for Aria Buds Pro with a carabiner so they clip to a bag. Leaves the charging port and pairing button open.",
    price: 650,
    options: [{ name: "Colour", values: ["Black", "Sage", "Lavender", "Volt"] }],
    weightGrams: 15,
  },

  // ---- Bags & carry --------------------------------------------------------
  {
    handle: "porter-tech-backpack",
    title: "Porter Tech Backpack",
    vendor: "Porter",
    tags: ["bag", "backpack", "travel", "featured"],
    description:
      "A 20-litre backpack with a suspended laptop compartment, a clamshell opening, and a luggage pass-through. Weatherproof 900D recycled nylon with YKK AquaGuard zips.",
    price: 12500,
    options: [{ name: "Colour", values: ["Black", "Olive", "Navy"] }],
    weightGrams: 1100,
  },
  {
    handle: "porter-sling",
    title: "Porter Sling",
    vendor: "Porter",
    tags: ["bag", "sling", "travel"],
    description:
      "A cross-body sling that swings round to the front for airport security. Fits a tablet, a power bank, and a passport, with a hidden back pocket for cash.",
    price: 5200,
    options: [
      { name: "Size", values: ["3 L", "6 L"] },
      { name: "Colour", values: ["Black", "Olive"] },
    ],
    priceDelta: { "6 L": 1300 },
    weightGrams: 420,
  },
  {
    handle: "porter-tech-pouch",
    title: "Porter Tech Pouch",
    vendor: "Porter",
    tags: ["bag", "organiser", "travel", "gift"],
    description:
      "An origami-style pouch that opens flat so everything inside is visible. Elastic loops, a padded sleeve for a small SSD, and a magnetic key leash.",
    price: 3600,
    options: [{ name: "Colour", values: ["Black", "Olive", "Navy"] }],
    weightGrams: 210,
  },
  {
    handle: "porter-laptop-briefcase",
    title: "Porter Laptop Briefcase",
    vendor: "Porter",
    tags: ["bag", "laptop", "work"],
    description:
      "A slim briefcase in waxed canvas and bridle leather with a padded 16-inch laptop section and a detachable shoulder strap. Ages well and gets better with use.",
    price: 14800,
    status: "DRAFT",
    options: [{ name: "Colour", values: ["Field Tan", "Black"] }],
    weightGrams: 1300,
  },

  // ---- Desk & stands -------------------------------------------------------
  {
    handle: "plinth-laptop-stand",
    title: "Plinth Laptop Stand",
    vendor: "Plinth",
    tags: ["desk", "stand", "laptop", "featured"],
    description:
      "A single piece of bent 4 mm aluminium that lifts a laptop screen to eye level and leaves room for a keyboard underneath. Silicone pads grip without marking.",
    price: 4600,
    options: [{ name: "Finish", values: ["Space Grey", "Silver"] }],
    weightGrams: 900,
  },
  {
    handle: "plinth-monitor-arm",
    title: "Plinth Gas-Spring Monitor Arm",
    vendor: "Plinth",
    tags: ["desk", "monitor", "arm"],
    description:
      "A gas-spring arm that holds a 34-inch ultrawide steady and moves with a fingertip. Clamp and grommet mounts included, with a cable channel down the length of the arm.",
    price: 9800,
    options: [
      { name: "Arms", values: ["Single", "Dual"] },
      { name: "Colour", values: ["Black", "White"] },
    ],
    priceDelta: { Dual: 6500 },
    weightGrams: 3200,
  },
  {
    handle: "plinth-usb-c-hub",
    title: "Plinth 8-in-1 USB-C Hub",
    vendor: "Plinth",
    tags: ["desk", "hub", "usb-c", "laptop"],
    description:
      "HDMI 4K60, two USB-A, one USB-C data, SD and microSD, gigabit Ethernet, and 100 W pass-through charging, all in a machined aluminium body that matches a laptop.",
    price: 6900,
    compareAt: 7900,
    options: [{ name: "Finish", values: ["Space Grey", "Silver"] }],
    weightGrams: 95,
  },
  {
    handle: "plinth-headphone-stand",
    title: "Plinth Headphone Stand",
    vendor: "Plinth",
    tags: ["desk", "stand", "audio", "gift"],
    description:
      "A weighted aluminium stand with a wide, curved cradle that won't crease a headband. Optional USB-C cable routed through the base.",
    price: 3100,
    options: [{ name: "Finish", values: ["Space Grey", "Silver", "Black"] }],
    weightGrams: 600,
  },
  {
    handle: "plinth-desk-lamp",
    title: "Plinth Desk Lamp",
    vendor: "Plinth",
    tags: ["desk", "lamp", "lighting"],
    description:
      "An asymmetric-beam lamp that lights the desk without glare on the monitor. Stepless brightness and colour temperature from 2700 K to 6000 K, with a memory of your last setting.",
    price: 7400,
    options: [{ name: "Colour", values: ["Black", "White"] }],
    weightGrams: 1500,
  },

  // ---- Wearables & misc ----------------------------------------------------
  {
    handle: "tempo-smartwatch-strap",
    title: "Tempo Fluoroelastomer Watch Strap",
    vendor: "Tempo",
    tags: ["wearable", "watch", "strap"],
    description:
      "A soft fluoroelastomer strap with a pin-and-tuck closure that lies flat under a cuff. Fits Apple Watch and Pixel Watch lug widths.",
    price: 1800,
    options: [
      { name: "Fits", values: ["Apple Watch 41/42 mm", "Apple Watch 45/46 mm", "Pixel Watch"] },
      { name: "Colour", values: ["Black", "Storm Blue", "Sunset"] },
    ],
    weightGrams: 30,
  },
  {
    handle: "tempo-tracker-tag",
    title: "Tempo Tracker Tag",
    vendor: "Tempo",
    tags: ["tracker", "travel", "gift"],
    description:
      "A coin-sized tracker that works with both Apple Find My and Google Find My Device. Replaceable battery lasts a year; a loud chirp finds keys under the sofa.",
    price: 2400,
    options: [{ name: "Pack", values: ["Single", "2-Pack", "4-Pack"] }],
    priceDelta: { "2-Pack": 2000, "4-Pack": 5600 },
    weightGrams: 10,
  },
  {
    handle: "fieldline-webcam",
    title: "Fieldline 4K Webcam",
    vendor: "Fieldline",
    tags: ["webcam", "creator", "desk"],
    description:
      "A 4K webcam with a Sony sensor, autofocus, and a privacy shutter that clicks shut. Tilts on its own mount or screws onto any tripod.",
    price: 13200,
    options: [{ name: "Colour", values: ["Black"] }],
    weightGrams: 160,
  },
  {
    handle: "fieldline-ring-light",
    title: "Fieldline Clip-On Ring Light",
    vendor: "Fieldline",
    tags: ["lighting", "creator", "portable"],
    description:
      "A slim ring light that clips to a laptop lid or monitor and runs off USB-C. Three colour temperatures and ten brightness steps.",
    price: 2100,
    status: "ARCHIVED",
    options: [{ name: "Colour", values: ["Black"] }],
    weightGrams: 90,
  },
];
