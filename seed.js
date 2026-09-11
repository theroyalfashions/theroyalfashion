const fs = require("fs");
const path = require("path");

const seed = [
  {
    id: "1001",
    name: "Royal Sovereign Gold-Rim Optical Frames",
    category: "Frames",
    price: 1899,
    oldPrice: 3499,
    description: "Handcrafted lightweight titanium optical frame with 18k gold-finish accents. Designed for timeless prestige and daily comfort.",
    image: "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:00:00.000Z"
  },
  {
    id: "1002",
    name: "Midnight Edition Acetate Round Frames",
    category: "Frames",
    price: 1699,
    oldPrice: 2999,
    description: "Premium handcrafted Italian acetate frame in deep piano black with custom beveling and spring flex hinges.",
    image: "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:05:00.000Z"
  },
  {
    id: "1003",
    name: "Royal Imperial Aviator Sunglasses",
    category: "Mens Sunglasses",
    price: 1999,
    oldPrice: 3999,
    description: "High-grade polarized UV400 lenses housed in a dual-bridge champagne gold alloy frame. Crafted for the distinguished gentleman.",
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:10:00.000Z"
  },
  {
    id: "1004",
    name: "Monarch Matte Black Square Shades",
    category: "Mens Sunglasses",
    price: 1799,
    oldPrice: 3299,
    description: "Bold square silhouette with anti-reflective polarized dark lenses and laser-engraved temple emblems.",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&q=80"
    ],
    featured: false,
    hidden: false,
    createdAt: "2026-09-10T10:15:00.000Z"
  },
  {
    id: "1005",
    name: "Crown Chronograph Gold Edition Watch",
    category: "Mens Watch",
    price: 3499,
    oldPrice: 6999,
    description: "Luxury quartz chronograph with triple sub-dials, sapphire-coated crystal, and solid stainless steel gold links.",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:20:00.000Z"
  },
  {
    id: "1006",
    name: "Apex Automatic Skeleton Black Dial Watch",
    category: "Mens Watch",
    price: 3999,
    oldPrice: 7999,
    description: "Exhibition skeleton dial showcasing intricate mechanical gears. Complete with water-resistant exhibition caseback and butterfly clasp.",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:25:00.000Z"
  },
  {
    id: "1007",
    name: "Handcrafted Italian Leather Oxford Shoes",
    category: "Mens Shoes",
    price: 2999,
    oldPrice: 5999,
    sizes: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    description: "Pure burnished calfskin leather oxford dress shoes. Goodyear welted leather sole, cushioned memory foam insole for royal comfort.",
    image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:30:00.000Z"
  },
  {
    id: "1008",
    name: "Royal High-Top Designer Street Sneakers",
    category: "Mens Shoes",
    price: 2499,
    oldPrice: 4799,
    sizes: ["UK 7", "UK 8", "UK 9", "UK 10", "UK 11"],
    description: "Elevated luxury sneaker silhouette crafted from full-grain white leather and suede panels. Non-slip vulcanized rubber sole.",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:35:00.000Z"
  },
  {
    id: "1009",
    name: "Heavyweight 260GSM Royal Crest T-Shirt",
    category: "Mens Tshirt",
    price: 1299,
    oldPrice: 2499,
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "100% premium combed French Terry cotton (260 GSM). Features subtle high-density gold embroidered crest on chest. Pre-shrunk luxury drape.",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:40:00.000Z"
  },
  {
    id: "1010",
    name: "Midnight Obsidian Oversized Luxury Tee",
    category: "Mens Tshirt",
    price: 1199,
    oldPrice: 2199,
    sizes: ["S", "M", "L", "XL", "XXL"],
    description: "Ultra-soft mercerized cotton with a structured drop-shoulder fit. Styled for effortless high-fashion layering.",
    image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80"
    ],
    featured: false,
    hidden: false,
    createdAt: "2026-09-10T10:45:00.000Z"
  },
  {
    id: "1011",
    name: "Duchess Rose Gold Diamond-Accent Watch",
    category: "Ladies Watch",
    price: 2899,
    oldPrice: 5499,
    description: "Sophisticated mother-of-pearl dial framed with shimmering crystal bezel. Powered by precision Japanese movement with rose gold mesh band.",
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:50:00.000Z"
  },
  {
    id: "1012",
    name: "Imperial Emerald Stiletto Evening Heels",
    category: "Ladies Shoes",
    price: 2799,
    oldPrice: 5299,
    sizes: ["IND 4", "IND 5", "IND 6", "IND 7", "IND 8"],
    description: "Sculpted 3.5-inch heel in luxe suede finish with padded arch support and non-slip sole. Perfect for galas and royal evenings.",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T10:55:00.000Z"
  },
  {
    id: "1013",
    name: "Monaco Quilted Leather Chain Handbag",
    category: "Ladies Bags",
    price: 2699,
    oldPrice: 4999,
    description: "Chevron-quilted lambskin finish with heavy gold-tone hardware chain and iconic twist-lock turn closure. Fits phone, wallet, and essentials.",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T11:00:00.000Z"
  },
  {
    id: "1014",
    name: "Italian Full-Grain Leather Bifold Wallet",
    category: "Wallet",
    price: 999,
    oldPrice: 1999,
    description: "RFID-blocking premium top-grain leather with 8 card slots, dual currency compartments, and embossed royal crest.",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T11:05:00.000Z"
  },
  {
    id: "1015",
    name: "Reversible 24k Gold Crown Buckle Belt",
    category: "Belt",
    price: 1199,
    oldPrice: 2299,
    sizes: ["30-34 Waist", "36-40 Waist", "42-46 Waist"],
    description: "Dual-sided reversible belt (Deep Black & Rich Cognac Brown) with polished 24k gold-plated crown buckle. Full-grain genuine leather.",
    image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=80"
    ],
    featured: true,
    hidden: false,
    createdAt: "2026-09-10T11:10:00.000Z"
  },
  {
    id: "1016",
    name: "Sartorial Textured Formal Leather Belt",
    category: "Belt",
    price: 1099,
    oldPrice: 1999,
    sizes: ["30-34 Waist", "36-40 Waist", "42-46 Waist"],
    description: "Fine cross-grain textured leather with satin-brushed gunmetal buckle. Perfect pairing for business suits and evening formals.",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80"
    ],
    featured: false,
    hidden: false,
    createdAt: "2026-09-10T11:15:00.000Z"
  }
];

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(path.join(dataDir, "products.json"), JSON.stringify(seed, null, 2), "utf8");
console.log("SUCCESS: Seeded " + seed.length + " products into data/products.json");
