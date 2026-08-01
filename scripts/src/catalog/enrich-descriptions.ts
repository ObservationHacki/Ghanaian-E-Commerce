/**
 * Rewrites product descriptions with researched model-line context and
 * expanded specs (CPU / RAM / storage / GPU / display).
 *
 * Usage:
 *   pnpm --filter @workspace/scripts exec tsx ./src/catalog/enrich-descriptions.ts
 *   pnpm --filter @workspace/scripts exec tsx ./src/catalog/enrich-descriptions.ts --dry-run
 */
import path from "node:path";
import { REPO_ROOT } from "./workbook";

type Specs = {
  brand: string;
  model: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu: string;
  color: string;
  screen: string;
  series: string;
};

type ModelProfile = {
  match: RegExp;
  title: string;
  displayHint?: string;
  blurb: string;
  /** Extra researched fields shown in the Specs table when known for the series. */
  extras?: {
    category?: string;
    formFactor?: string;
    chassis?: string;
    keyboard?: string;
    connectivity?: string;
    ports?: string;
    durability?: string;
    audio?: string;
    cooling?: string;
    operatingSystem?: string;
  };
};

const MODEL_PROFILES: ModelProfile[] = [
  // ASUS gaming / ROG / TUF
  {
    match: /FX506|TUF.?F15.*506/i,
    title: "ASUS TUF Gaming F15 (FX506)",
    displayHint: '15.6" Full HD up to 144Hz IPS',
    blurb:
      "A durable mid-range gaming notebook with a reinforced chassis, fast-refresh display, and dedicated NVIDIA graphics for 1080p gaming and creative work.",
  },
  {
    match: /FX507|TUF.?F15.*507/i,
    title: "ASUS TUF Gaming F15 (FX507)",
    displayHint: '15.6" Full HD / QHD high-refresh IPS',
    blurb:
      "Next-gen TUF F15 with stronger cooling, MUX-switch GPU options, and a high-refresh panel suited to competitive gaming and content creation.",
  },
  {
    match: /FX95|FX86|TUF.?FX/i,
    title: "ASUS TUF Gaming",
    displayHint: '15.6" Full HD gaming display',
    blurb:
      "ASUS TUF Gaming laptop built for everyday gaming with a tough chassis, discrete NVIDIA GPU, and a configuration ready for modern titles at 1080p.",
  },
  {
    match: /TUF-FX80|FX80/i,
    title: "ASUS TUF Gaming FX80",
    displayHint: '15.6" Full HD',
    blurb:
      "Earlier-generation ASUS TUF gaming laptop with a sturdy build and dedicated GTX graphics for casual gaming, editing, and schoolwork.",
  },
  {
    match: /TUF-FX63|FX63/i,
    title: "ASUS TUF Gaming FX63",
    displayHint: '15.6" Full HD',
    blurb:
      "Entry TUF gaming machine with discrete graphics  -  a practical pick for older titles, media, and everyday multitasking.",
  },
  {
    match: /FX608|FA608|Tianxuan/i,
    title: "ASUS TUF Gaming (Tianxuan / FX608)",
    displayHint: '15.6"-16" high-refresh gaming display',
    blurb:
      "Recent ASUS TUF / Tianxuan gaming series with modern Intel or AMD CPUs and RTX 50-series class graphics for demanding games and creators.",
  },
  {
    match: /ROG Striker|ROG Strix|Striker 9/i,
    title: "ASUS ROG Strix / Striker",
    displayHint: '16"-18" high-refresh ROG display',
    blurb:
      "Flagship ROG gaming laptop with a high-power CPU/GPU stack, advanced cooling, and a large high-refresh panel for esports and AAA titles.",
  },
  {
    match: /Wuwei|Vivobook/i,
    title: "ASUS Vivobook (Wuwei)",
    displayHint: '14"-16" FHD / OLED class display',
    blurb:
      "Slim everyday ASUS Vivobook for study and office work  -  light chassis, solid battery-oriented design, and integrated graphics for productivity.",
  },
  {
    match: /A-Dou|ADOL|M5406/i,
    title: "ASUS a豆 / ADOL Air",
    displayHint: '14" slim consumer display',
    blurb:
      "Stylish lightweight ASUS consumer ultraportable aimed at students and creatives who want a thin design with strong AMD Ryzen performance.",
  },
  {
    match: /PX[45]63|Poxiao/i,
    title: "ASUS ProArt / Creator (Poxiao)",
    displayHint: '14"-16" productivity display',
    blurb:
      "ASUS creator-leaning notebook with integrated graphics  -  suited to documents, browsing, light photo work, and all-day school or office use.",
  },
  // HP business / consumer
  {
    match: /ZBOOK|ZBook/i,
    title: "HP ZBook mobile workstation",
    displayHint: '15.6" FHD workstation display',
    blurb:
      "HP ZBook mobile workstation built for CAD, 3D, and heavy professional apps, with ISV-oriented reliability and optional discrete GPU configs.",
  },
  {
    match: /X360-1040|1040 G/i,
    title: "HP EliteBook x360 1040",
    displayHint: '14" FHD touch convertible',
    blurb:
      "Premium HP EliteBook x360 convertible  -  thin aluminum chassis, 360° hinge (laptop / tablet / tent), enterprise security, and a bright touch display.",
  },
  {
    match: /X360-1030|1030 G/i,
    title: "HP EliteBook x360 1030",
    displayHint: '13.3" FHD touch convertible',
    blurb:
      "Compact EliteBook x360 2-in-1 with Gorilla Glass touch panel, Thunderbolt docking support, and MIL-STD durability for executives on the move.",
  },
  {
    match: /X360-830|830 G8/i,
    title: "HP EliteBook x360 830",
    displayHint: '13.3" FHD touch convertible',
    blurb:
      "Business convertible EliteBook with a flexible hinge, strong keyboard, and managed-security features for hybrid office work.",
  },
  {
    match: /860G|EliteBook 860/i,
    title: "HP EliteBook 860",
    displayHint: '16" FHD business display',
    blurb:
      "Large-screen EliteBook for spreadsheets and multitasking  -  premium build, docking-friendly ports, and long-session comfort.",
  },
  {
    match: /850G|EliteBook 850/i,
    title: "HP EliteBook 850",
    displayHint: '15.6" FHD business display',
    blurb:
      "15.6\" EliteBook productivity laptop with a roomy keyboard deck, enterprise manageability, and configs suited to office and fieldwork.",
  },
  {
    match: /840G|EliteBook 840/i,
    title: "HP EliteBook 840",
    displayHint: '14" FHD anti-glare IPS',
    blurb:
      "HP's classic 14\" business ultraportable  -  CNC aluminum options, quiet keyboard, Wi-Fi 6 / Thunderbolt docking on newer gens, and MIL-STD testing.",
  },
  {
    match: /830G|EliteBook 830/i,
    title: "HP EliteBook 830",
    displayHint: '13.3" FHD business display',
    blurb:
      "Compact EliteBook for travel  -  strong security stack, solid typing experience, and enough performance for Microsoft 365 and video calls.",
  },
  {
    match: /640G|ProBook 640/i,
    title: "HP ProBook 640",
    displayHint: '14" HD / FHD business display',
    blurb:
      "Reliable HP ProBook for everyday office tasks  -  durable plastic/metal mix, essential ports, and a value-friendly business configuration.",
  },
  {
    match: /440-?G|440G|ProBook 440/i,
    title: "HP ProBook 440",
    displayHint: '14" FHD business display',
    blurb:
      "Affordable ProBook 14\" notebook for students and SMEs  -  practical ports, solid keyboard, and configs ready for Windows productivity apps.",
  },
  {
    match: /430G|ProBook 430/i,
    title: "HP ProBook 430",
    displayHint: '13.3" HD / FHD display',
    blurb:
      "Smaller ProBook ultraportable for light office work, browsing, and classroom use where portability matters most.",
  },
  {
    match: /240RG|240 G|HP 240/i,
    title: "HP 240 / Pavilion-class 14",
    displayHint: '14" FHD display',
    blurb:
      "Everyday HP 14\" laptop for home and school  -  balanced specs for documents, streaming, and light multitasking.",
  },
  {
    match: /PAVILION 13|Pavilion 13/i,
    title: "HP Pavilion 13",
    displayHint: '13.3" FHD consumer display',
    blurb:
      "Compact Pavilion ultraportable for students  -  light enough for a bag, capable for coursework, Zoom, and entertainment.",
  },
  {
    match: /845G|745G|EliteBook 845|EliteBook 745/i,
    title: "HP EliteBook 845 / 745 (AMD)",
    displayHint: '14" FHD business display',
    blurb:
      "AMD Ryzen EliteBook business laptop with strong multi-core efficiency, long battery focus, and enterprise security features.",
  },
  {
    match: /OMEN|Pavilion [5-9]/i,
    title: "HP OMEN / Pavilion Gaming",
    displayHint: '15.6" Full HD gaming display',
    blurb:
      "HP gaming notebook with discrete NVIDIA graphics  -  suited to popular titles, streaming, and creative apps that benefit from a dedicated GPU.",
  },
  // Dell
  {
    match: /\b54[0-4]0\b|Latitude 54/i,
    title: "Dell Latitude 5400 / 5410 / 5420 / 5440",
    displayHint: '14" FHD business display',
    blurb:
      "Dell Latitude 14\" business laptop  -  dependable keyboard, manageability, and a chassis designed for daily office and hybrid work.",
  },
  {
    match: /\b74[0-4]0\b|Latitude 74/i,
    title: "Dell Latitude 7400 / 7410 / 7420 / 7490",
    displayHint: '14" FHD premium business display',
    blurb:
      "Premium Dell Latitude ultraportable with a slim profile, strong battery focus, and configurations popular with corporate fleets.",
  },
  {
    match: /\b34[0-2]0\b|Latitude 34|Vostro 34/i,
    title: "Dell Latitude / Vostro 3400 series",
    displayHint: '14" HD / FHD display',
    blurb:
      "Value Dell 14\" business notebook for essential work  -  email, Office, browsing, and light multitasking at a practical price.",
  },
  // Lenovo ThinkPad
  {
    match: /X1C|X1 Carbon/i,
    title: "Lenovo ThinkPad X1 Carbon",
    displayHint: '14" FHD IPS',
    blurb:
      "Flagship ThinkPad ultraportable  -  carbon-fiber chassis, legendary keyboard, and a thin profile trusted by executives and consultants.",
  },
  {
    match: /\bX13\b/i,
    title: "Lenovo ThinkPad X13",
    displayHint: '13.3" FHD IPS',
    blurb:
      "Compact ThinkPad X series ultraportable for travel  -  durable build, excellent keyboard, and business security options.",
  },
  {
    match: /\bT14S\b|T14s/i,
    title: "Lenovo ThinkPad T14s",
    displayHint: '14" FHD IPS',
    blurb:
      "Premium thin ThinkPad T14s  -  strong battery life, dock-ready ports, and a balance of power and portability for professionals.",
  },
  {
    match: /\bT14\b/i,
    title: "Lenovo ThinkPad T14",
    displayHint: '14" FHD IPS',
    blurb:
      "Mainstream ThinkPad T14 workhorse  -  durable, repairable, and configured for all-day business productivity.",
  },
  {
    match: /T480|T490|T470|T460|T450|T440|T580|T590/i,
    title: "Lenovo ThinkPad T series",
    displayHint: '14"-15.6" FHD IPS',
    blurb:
      "Classic ThinkPad T-series business laptop known for its keyboard, trackpoint, and long service life in offices and field roles.",
  },
  {
    match: /\bL13\b|\bL390\b|\bL480\b|E14|L14|R14/i,
    title: "Lenovo ThinkPad L / E series",
    displayHint: '13"-14" FHD display',
    blurb:
      "Value ThinkPad for SMEs and education  -  practical ports, solid typing, and reliable daily performance for Office and browsing.",
  },
];

function expandCpu(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();

  s = s.replace(/\bVGA\s*2G\b/i, "").trim();
  s = s.replace(/\(GPU-4G\)/i, "").trim();

  // Intel Core Ultra
  s = s.replace(/\bU9-?(\d{3}HX?)\b/i, "Intel Core Ultra 9 $1");
  s = s.replace(/\bU7-?(\d{3}HX?)\b/i, "Intel Core Ultra 7 $1");
  s = s.replace(/\bU5-?(\d{3})\b/i, "Intel Core Ultra 5 $1");
  s = s.replace(/\bU9\b/i, "Intel Core Ultra 9");
  s = s.replace(/\bCore\s*5\s+(\d+)/i, "Intel Core 5 $1");

  // Intel Core i + gen shorthand used in the pricelist
  s = s.replace(
    /\bI([3579])-(\d+)(?:th)?\b/i,
    (_m, tier: string, gen: string) => `Intel Core i${tier} (${gen}th Gen)`,
  );
  s = s.replace(
    /\bi([3579])-(\d+)(?:th)?\b/,
    (_m, tier: string, gen: string) => `Intel Core i${tier} (${gen}th Gen)`,
  );
  // Bare gen like I7-14900 / I7-14650 (model number style)
  s = s.replace(
    /\bI([3579])-(\d{4,5}[A-Z]*)\b/i,
    (_m, tier: string, model: string) => `Intel Core i${tier}-${model}`,
  );

  // AMD
  s = s.replace(/\bRyzen7-?H?(\d{3})\b/i, "AMD Ryzen AI 7 H$1");
  s = s.replace(/\bRyzen7\s+(\d{4})\b/i, "AMD Ryzen 7 $1");
  s = s.replace(/\bR7-H(\d{3})\b/i, "AMD Ryzen AI 7 H$1");
  s = s.replace(/\bR5-(\d{4}U)\b/i, "AMD Ryzen 5 $1");
  s = s.replace(/\bRyzen-R7\b/i, "AMD Ryzen 7");
  s = s.replace(/\bRyzen-R5\b/i, "AMD Ryzen 5");

  return s.replace(/\s+/g, " ").trim();
}

function expandRam(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/(\d+)\s*G/i);
  if (m) return `${m[1]}GB RAM`;
  if (/^\d+$/.test(raw.trim())) return `${raw.trim()}GB RAM`;
  return raw;
}

function expandStorage(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  s = s.replace(/\b(\d+)\s*TB\b/i, "$1TB SSD");
  s = s.replace(/\b(\d+)\s*G\b/i, "$1GB SSD");
  s = s.replace(/\b(\d+)\s*SSD\b/i, "$1GB SSD");
  if (/\b500G\b/i.test(raw)) s = "500GB storage";
  if (/\b128G\b/i.test(raw)) s = "128GB SSD";
  if (!/SSD|HDD|storage/i.test(s) && /\d/.test(s)) s = `${s} storage`;
  return s;
}

function expandGpu(raw: string): string {
  if (!raw) return "integrated graphics";
  let s = raw.trim();
  if (/integrated/i.test(s)) return "Intel / AMD integrated graphics";

  s = s.replace(/\bRTX\s*(\d{4})(?:-(\d+)G)?\b/i, (_m, model, vram) =>
    vram
      ? `NVIDIA GeForce RTX ${model} (${vram}GB)`
      : `NVIDIA GeForce RTX ${model}`,
  );
  s = s.replace(/\bGTX\s*(\d{3,4})(?:Ti)?(?:-(\d+)G)?\b/i, (m) => {
    const ti = /Ti/i.test(m) ? " Ti" : "";
    const model = m.match(/GTX\s*(\d{3,4})/i)?.[1] ?? "";
    const vram = m.match(/-(\d+)G/i)?.[1];
    return vram
      ? `NVIDIA GeForce GTX ${model}${ti} (${vram}GB)`
      : `NVIDIA GeForce GTX ${model}${ti}`;
  });
  s = s.replace(/\bGPU-4G\b/i, "dedicated GPU (4GB)");
  s = s.replace(/\bVGA\s*2G\b/i, "dedicated GPU (2GB)");
  return s;
}

function expandScreen(raw: string, profileHint?: string): string {
  if (!raw) return profileHint ? profileHint : "";
  const cleaned = raw.replace(/["']/g, "").trim();
  if (!cleaned) return profileHint ? profileHint : "";
  // Prefer researched series hint when the listing only has a coarse size
  // (e.g. "15" or "15.6") so shoppers see Full HD / refresh context.
  if (profileHint && /^\d+(\.\d+)?$/.test(cleaned)) return profileHint;
  if (/^\d+(\.\d+)?$/.test(cleaned)) return `${cleaned}" display`;
  return cleaned.includes("display") ? cleaned : `${cleaned} display`;
}

function parseFromName(name: string): Partial<Specs> {
  const parts = name.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
  const brand = parts[0] ?? "";
  const model = parts[1] ?? "";
  const rest = parts.slice(2);

  let cpu = "";
  let ram = "";
  let storage = "";
  let gpu = "";
  let color = "";

  for (const part of rest) {
    if (
      /^(I[3579]|i[3579]|U[579]|Core|Ryzen|R[57]-)/i.test(part) ||
      /th\b/i.test(part)
    ) {
      cpu = part;
    } else if (/^\d+\s*G$/i.test(part) || /^\d+$/.test(part)) {
      if (!ram) ram = part;
      else if (!storage) storage = part;
    } else if (/\b(TB|SSD|HDD|128G|256G|512G|1TB|2TB|500G)\b/i.test(part)) {
      storage = part;
    } else if (/RTX|GTX|Integrated|GPU|VGA/i.test(part)) {
      gpu = part;
    } else if (/Grey|Gray|Blue|Pink|Silver|Teal|Black|White/i.test(part)) {
      color = part;
    } else if (!cpu) {
      cpu = part;
    }
  }

  return { brand, model, cpu, ram, storage, gpu, color };
}

function parseFromDescription(description: string): Partial<Specs> {
  const get = (label: string) => {
    const line = description.match(
      new RegExp(`(?:^|\\n)${label}:\\s*(.+)$`, "im"),
    );
    if (line?.[1]) return line[1].trim();
    // Legacy sentence form; allow decimals like 15.6 by stopping at ". ".
    const sentence = description.match(
      new RegExp(`${label}:\\s*(.+?)(?:\\.\\s|\\.$|$)`, "i"),
    );
    return sentence?.[1]?.trim() ?? "";
  };
  return {
    series: get("Series"),
    cpu: get("CPU") || get("Processor"),
    ram: get("RAM") || get("Memory"),
    storage: get("Storage"),
    gpu: get("GPU") || get("Graphics"),
    screen: get("Display"),
    color: get("Color") || get("Colour") || get("Finish"),
  };
}

function inferExtras(
  profile: ModelProfile,
  brand: string,
  gpu: string,
  categoryName: string,
): NonNullable<ModelProfile["extras"]> {
  const gaming = /gaming|rtx|gtx|tuf|rog|omen/i.test(
    `${profile.title} ${gpu} ${categoryName}`,
  );
  const convertible = /x360|2-in-1|convertible/i.test(profile.title);
  const workstation = /zbook|workstation/i.test(profile.title);
  const thinkpad = /thinkpad/i.test(profile.title);
  const elite = /elitebook|latitude 74|x1 carbon|t14s/i.test(profile.title);

  const size = profile.displayHint?.match(/(\d+(?:\.\d+)?")/)?.[1];
  const base: NonNullable<ModelProfile["extras"]> = {
    category: gaming
      ? "Gaming laptop"
      : workstation
        ? "Mobile workstation"
        : convertible
          ? "2-in-1 convertible"
          : "Business / productivity laptop",
    formFactor: size ? `${size} class notebook` : "Notebook PC",
    operatingSystem: "Windows (license / install may vary by unit)",
    ...profile.extras,
  };

  if (gaming) {
    return {
      chassis: "Reinforced gaming chassis with dedicated cooling vents",
      keyboard: "Full-size gaming keyboard (RGB on select models)",
      cooling: "Multi-heatpipe dual-fan cooling tuned for GPU load",
      connectivity: "Wi-Fi 5/6 + Bluetooth (generation varies by unit)",
      ports:
        'USB-A, USB-C, HDMI, headphone jack; LAN on many 15.6" gaming models',
      audio: "Stereo speakers; headphone jack for headset gaming",
      ...base,
    };
  }

  if (thinkpad) {
    return {
      chassis: "ThinkPad durable chassis with TrackPoint + trackpad",
      keyboard: "Legendary ThinkPad keyboard with optional backlight",
      connectivity: "Wi-Fi + Bluetooth; WWAN on select configs",
      ports: "USB-A/C, HDMI or docking port depending on generation",
      durability: "Military-spec durability testing (series-dependent)",
      ...base,
    };
  }

  if (convertible) {
    return {
      chassis: "360-degree hinge convertible (laptop / tablet / tent / stand)",
      keyboard: "Backlit keyboard on most EliteBook x360 configs",
      connectivity: "Wi-Fi 6 + Bluetooth; Thunderbolt docking on G7/G8",
      ports: "Thunderbolt / USB-C, USB-A, HDMI (varies by generation)",
      durability: "MIL-STD style durability testing on EliteBook lines",
      ...base,
    };
  }

  if (elite || brand === "HP" || brand === "Dell") {
    return {
      chassis: elite
        ? "Premium metal / CNC business chassis"
        : "Business notebook chassis",
      keyboard: "Spill-resistant business keyboard (backlit on many models)",
      connectivity: "Wi-Fi + Bluetooth; docking support on Elite/Latitude lines",
      ports: "USB-A/C, HDMI; RJ-45 or USB-C dock on select models",
      durability: "Business-line drop / MIL-STD testing on many configs",
      ...base,
    };
  }

  return {
    chassis: "Everyday notebook chassis",
    keyboard: "Full-size chiclet keyboard",
    connectivity: "Wi-Fi + Bluetooth",
    ports: "USB, HDMI / video out, headphone jack (exact set varies)",
    ...base,
  };
}

function resolveProfile(brand: string, model: string, series: string): ModelProfile {
  const haystack = `${brand} ${model} ${series}`;
  for (const profile of MODEL_PROFILES) {
    if (profile.match.test(haystack)) return profile;
  }

  return {
    match: /.*/,
    title: `${brand} ${model}`.trim(),
    blurb:
      brand.toLowerCase() === "asus"
        ? "ASUS notebook configured for everyday computing, study, and entertainment with the specs listed below."
        : brand.toLowerCase() === "hp"
          ? "HP laptop configured for productivity and daily use with the specs listed below."
          : brand.toLowerCase() === "dell"
            ? "Dell business/personal laptop configured for office work and multitasking with the specs listed below."
            : brand.toLowerCase() === "lenovo"
              ? "Lenovo ThinkPad-class laptop known for durability and keyboard comfort, configured with the specs listed below."
              : "Laptop configured with the specs listed below for everyday work and study.",
  };
}

function useCaseLine(gpu: string, categoryHint: string): string {
  const g = gpu.toLowerCase();
  if (/rtx|gtx|dedicated/.test(g)) {
    return "Best for gaming, video editing, 3D classwork, and GPU-accelerated apps.";
  }
  if (/gaming/i.test(categoryHint)) {
    return "Configured for gaming and creative workloads that benefit from discrete graphics.";
  }
  return "Best for Microsoft Office, browsing, Zoom calls, coursework, and light multitasking.";
}

export function buildEnrichedDescription(input: {
  name: string;
  description: string;
  brandName?: string | null;
  categoryName?: string | null;
}): string {
  const fromName = parseFromName(input.name);
  const fromDesc = parseFromDescription(input.description);

  const brand = (input.brandName || fromName.brand || "").trim();
  const model = (fromName.model || "").trim();
  const series = fromDesc.series || "";
  const cpu = expandCpu(fromName.cpu || fromDesc.cpu || "");
  const ram = expandRam(fromName.ram || fromDesc.ram || "");
  const storage = expandStorage(fromName.storage || fromDesc.storage || "");
  const gpu = expandGpu(fromName.gpu || fromDesc.gpu || "");
  const color = (fromName.color || fromDesc.color || "").trim();

  const profile = resolveProfile(brand, model, series);
  // Prefer researched series display copy so re-runs don't mangle quote marks.
  const display =
    profile.displayHint || expandScreen(fromDesc.screen || "");
  const extras = inferExtras(
    profile,
    brand,
    gpu,
    input.categoryName || "",
  );

  const graphics =
    fromName.gpu || fromDesc.gpu || gpu !== "integrated graphics"
      ? gpu
      : "Integrated graphics";

  const rows: Array<[string, string]> = [
    ["Model", profile.title],
    ["Brand", brand],
    ["Category", extras.category || ""],
    ["Processor", cpu],
    ["Memory", ram],
    ["Storage", storage],
    ["Graphics", graphics],
    ["Display", display],
    ["Form factor", extras.formFactor || ""],
    ["Chassis", extras.chassis || ""],
    ["Keyboard", extras.keyboard || ""],
    ["Cooling", extras.cooling || ""],
    ["Connectivity", extras.connectivity || ""],
    ["Ports", extras.ports || ""],
    ["Audio", extras.audio || ""],
    ["Durability", extras.durability || ""],
    ["Operating system", extras.operatingSystem || ""],
    ["Colour / finish", color],
  ].filter(([, value]) => Boolean(value && String(value).trim()));

  const specBlock = rows.map(([label, value]) => `${label}: ${value}`).join("\n");

  const text = [
    `${profile.title}. ${profile.blurb}`,
    "Specifications",
    specBlock,
    `Ideal for: ${useCaseLine(gpu, input.categoryName || "")
      .replace(/^(Best for|Configured for)\s+/i, "")
      .replace(/\.$/, "")}.`,
  ].join("\n\n");

  // Keep DB copy ASCII-safe for Windows/terminal tooling.
  return text
    .replaceAll("\u2014", " - ")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2019", "'")
    .replaceAll("\u2011", "-");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  try {
    process.loadEnvFile(path.join(REPO_ROOT, ".env"));
  } catch {
    // fall through
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env at the repo root.");
    process.exit(1);
  }

  const { db, pool, productsTable, categoriesTable, brandsTable } = await import(
    "@workspace/db"
  );
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      brandName: brandsTable.name,
      categoryName: categoriesTable.name,
    })
    .from(productsTable)
    .leftJoin(brandsTable, eq(brandsTable.id, productsTable.brandId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId));

  console.log(`Loaded ${rows.length} products${dryRun ? " (dry-run)" : ""}.`);

  let updated = 0;
  for (const row of rows) {
    const next = buildEnrichedDescription(row);
    if (next === row.description) continue;

    if (dryRun) {
      if (updated < 3) {
        console.log("\n---", row.id, row.name);
        console.log(next);
      }
    } else {
      await db
        .update(productsTable)
        .set({ description: next })
        .where(eq(productsTable.id, row.id));
    }
    updated += 1;
  }

  console.log(`${dryRun ? "Would update" : "Updated"} ${updated} descriptions.`);
  await pool.end();
}

const isDirect = process.argv[1]?.includes("enrich-descriptions");
if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
