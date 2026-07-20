import "dotenv/config";
import { db } from "./config/db.js";
import {
  users, sites, categories, membershipPlans,
  tags, states, cities, utilityData, revenueConfig, articles,
} from "../drizzle/schema.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ─── Super Admin ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);
  const [admin] = await db
    .insert(users)
    .values({
      name: "Super Admin",
      email: "admin@news.com",
      passwordHash,
      role: "super_admin",
      isVerified: true,
    })
    .onConflictDoNothing()
    .returning();
  console.log("✓ Super Admin created:", admin?.email ?? "already exists");

  // ─── Default Site ───────────────────────────────────────────────────────────
  const [site] = await db
    .insert(sites)
    .values({
      name: "The Local Leader",
      slug: "the-local-leader",
      domain: "localhost",
      language: "hi",
      region: "India",
      description: "Hindi News Portal",
      theme: {
        primaryColor: "#E53E3E",
        secondaryColor: "#FF8C00",
        headerBg: "#1a1a2e",
        fontFamily: "Noto Sans Devanagari",
        navStyle: "mega-menu",
      },
    })
    .onConflictDoNothing()
    .returning();
  console.log("✓ Default site created:", site?.name ?? "already exists");

  // ─── Categories ─────────────────────────────────────────────────────────────
  const categoryList = [
    { name: "Politics", nameHindi: "राजनीति", slug: "politics", color: "#E53E3E", sortOrder: 1 },
    { name: "National", nameHindi: "राष्ट्रीय", slug: "national", color: "#DD6B20", sortOrder: 2 },
    { name: "International", nameHindi: "अंतर्राष्ट्रीय", slug: "international", color: "#3182CE", sortOrder: 3 },
    { name: "Sports", nameHindi: "खेल", slug: "sports", color: "#38A169", sortOrder: 4 },
    { name: "Entertainment", nameHindi: "मनोरंजन", slug: "entertainment", color: "#805AD5", sortOrder: 5 },
    { name: "Business", nameHindi: "व्यापार", slug: "business", color: "#D69E2E", sortOrder: 6 },
    { name: "Technology", nameHindi: "तकनीक", slug: "technology", color: "#00B5D8", sortOrder: 7 },
    { name: "Education", nameHindi: "शिक्षा", slug: "education", color: "#319795", sortOrder: 8 },
    { name: "Health", nameHindi: "स्वास्थ्य", slug: "health", color: "#E53E3E", sortOrder: 9 },
    { name: "Crime", nameHindi: "अपराध", slug: "crime", color: "#718096", sortOrder: 10 },
    { name: "Lifestyle", nameHindi: "जीवनशैली", slug: "lifestyle", color: "#ED64A6", sortOrder: 11 },
    { name: "Agriculture", nameHindi: "कृषि", slug: "agriculture", color: "#48BB78", sortOrder: 12 },
  ];

  for (const cat of categoryList) {
    await db.insert(categories).values({ ...cat, siteId: site?.id }).onConflictDoNothing();
  }
  console.log("✓ Categories seeded:", categoryList.length);

  // ─── Tags ───────────────────────────────────────────────────────────────────
  const tagList = [
    { name: "Breaking News", slug: "breaking-news" },
    { name: "Elections", slug: "elections" },
    { name: "Cricket", slug: "cricket" },
    { name: "Bollywood", slug: "bollywood" },
    { name: "Budget", slug: "budget" },
    { name: "Weather", slug: "weather" },
    { name: "COVID-19", slug: "covid-19" },
    { name: "IPL", slug: "ipl" },
  ];

  for (const tag of tagList) {
    await db.insert(tags).values(tag).onConflictDoNothing();
  }
  console.log("✓ Tags seeded:", tagList.length);

  // ─── States & Union Territories ─────────────────────────────────────────────
  // Each city is [name, nameHindi, latitude, longitude] — real-world coordinates,
  // used for nearest-city matching against browser Geolocation API results.
  const stateList = [
    { name: "Andhra Pradesh", nameHindi: "आंध्र प्रदेश", slug: "andhra-pradesh", code: "AP", sortOrder: 1,
      cities: [["Visakhapatnam", "विशाखापत्तनम", 17.6868, 83.2185], ["Vijayawada", "विजयवाड़ा", 16.5062, 80.6480], ["Guntur", "गुंटूर", 16.3067, 80.4365], ["Nellore", "नेल्लोर", 14.4426, 79.9865], ["Tirupati", "तिरुपति", 13.6288, 79.4192]] },
    { name: "Arunachal Pradesh", nameHindi: "अरुणाचल प्रदेश", slug: "arunachal-pradesh", code: "AR", sortOrder: 2,
      cities: [["Itanagar", "ईटानगर", 27.0844, 93.6053], ["Naharlagun", "नाहरलगुन", 27.1044, 93.6953], ["Pasighat", "पासीघाट", 28.0669, 95.3269], ["Tawang", "तवांग", 27.5859, 91.8594]] },
    { name: "Assam", nameHindi: "असम", slug: "assam", code: "AS", sortOrder: 3,
      cities: [["Guwahati", "गुवाहाटी", 26.1445, 91.7362], ["Silchar", "सिलचर", 24.8333, 92.7789], ["Dibrugarh", "डिब्रूगढ़", 27.4728, 94.9120], ["Jorhat", "जोरहाट", 26.7509, 94.2037], ["Nagaon", "नगांव", 26.3480, 92.6840]] },
    { name: "Bihar", nameHindi: "बिहार", slug: "bihar", code: "BR", sortOrder: 4,
      cities: [["Patna", "पटना", 25.5941, 85.1376], ["Gaya", "गया", 24.7955, 84.9994], ["Bhagalpur", "भागलपुर", 25.2425, 86.9842], ["Muzaffarpur", "मुजफ्फरपुर", 26.1225, 85.3906], ["Darbhanga", "दरभंगा", 26.1542, 85.8918]] },
    { name: "Chhattisgarh", nameHindi: "छत्तीसगढ़", slug: "chhattisgarh", code: "CG", sortOrder: 5,
      cities: [["Raipur", "रायपुर", 21.2514, 81.6296], ["Bhilai", "भिलाई", 21.2094, 81.4285], ["Bilaspur", "बिलासपुर", 22.0797, 82.1409], ["Korba", "कोरबा", 22.3595, 82.7501], ["Durg", "दुर्ग", 21.1904, 81.2849]] },
    { name: "Goa", nameHindi: "गोवा", slug: "goa", code: "GA", sortOrder: 6,
      cities: [["Panaji", "पणजी", 15.4909, 73.8278], ["Margao", "मडगांव", 15.2832, 73.9862], ["Vasco da Gama", "वास्को डी गामा", 15.3955, 73.8154], ["Mapusa", "मापुसा", 15.5937, 73.8142]] },
    { name: "Gujarat", nameHindi: "गुजरात", slug: "gujarat", code: "GJ", sortOrder: 7,
      cities: [["Ahmedabad", "अहमदाबाद", 23.0225, 72.5714], ["Surat", "सूरत", 21.1702, 72.8311], ["Vadodara", "वडोदरा", 22.3072, 73.1812], ["Rajkot", "राजकोट", 22.3039, 70.8022], ["Bhavnagar", "भावनगर", 21.7645, 72.1519]] },
    { name: "Haryana", nameHindi: "हरियाणा", slug: "haryana", code: "HR", sortOrder: 8,
      cities: [["Gurugram", "गुरुग्राम", 28.4595, 77.0266], ["Faridabad", "फरीदाबाद", 28.4089, 77.3178], ["Panipat", "पानीपत", 29.3909, 76.9635], ["Ambala", "अंबाला", 30.3782, 76.7767], ["Karnal", "करनाल", 29.6857, 76.9905]] },
    { name: "Himachal Pradesh", nameHindi: "हिमाचल प्रदेश", slug: "himachal-pradesh", code: "HP", sortOrder: 9,
      cities: [["Shimla", "शिमला", 31.1048, 77.1734], ["Manali", "मनाली", 32.2432, 77.1892], ["Dharamshala", "धर्मशाला", 32.2190, 76.3234], ["Solan", "सोलन", 30.9045, 77.0967]] },
    { name: "Jharkhand", nameHindi: "झारखंड", slug: "jharkhand", code: "JH", sortOrder: 10,
      cities: [["Ranchi", "रांची", 23.3441, 85.3096], ["Jamshedpur", "जमशेदपुर", 22.8046, 86.2029], ["Dhanbad", "धनबाद", 23.7957, 86.4304], ["Bokaro", "बोकारो", 23.6693, 86.1511]] },
    { name: "Karnataka", nameHindi: "कर्नाटक", slug: "karnataka", code: "KA", sortOrder: 11,
      cities: [["Bengaluru", "बेंगलुरु", 12.9716, 77.5946], ["Mysuru", "मैसूरु", 12.2958, 76.6394], ["Hubballi", "हुबली", 15.3647, 75.1240], ["Mangaluru", "मंगलुरु", 12.9141, 74.8560], ["Belagavi", "बेलगावी", 15.8497, 74.4977]] },
    { name: "Kerala", nameHindi: "केरल", slug: "kerala", code: "KL", sortOrder: 12,
      cities: [["Thiruvananthapuram", "तिरुवनंतपुरम", 8.5241, 76.9366], ["Kochi", "कोच्चि", 9.9312, 76.2673], ["Kozhikode", "कोझिकोड", 11.2588, 75.7804], ["Thrissur", "त्रिशूर", 10.5276, 76.2144], ["Kollam", "कोल्लम", 8.8932, 76.6141]] },
    { name: "Madhya Pradesh", nameHindi: "मध्य प्रदेश", slug: "madhya-pradesh", code: "MP", sortOrder: 13,
      cities: [["Bhopal", "भोपाल", 23.2599, 77.4126], ["Indore", "इंदौर", 22.7196, 75.8577], ["Gwalior", "ग्वालियर", 26.2183, 78.1828], ["Jabalpur", "जबलपुर", 23.1815, 79.9864], ["Ujjain", "उज्जैन", 23.1765, 75.7885]] },
    { name: "Maharashtra", nameHindi: "महाराष्ट्र", slug: "maharashtra", code: "MH", sortOrder: 14,
      cities: [["Mumbai", "मुंबई", 19.0760, 72.8777], ["Pune", "पुणे", 18.5204, 73.8567], ["Nagpur", "नागपुर", 21.1458, 79.0882], ["Nashik", "नासिक", 19.9975, 73.7898], ["Aurangabad", "औरंगाबाद", 19.8762, 75.3433]] },
    { name: "Manipur", nameHindi: "मणिपुर", slug: "manipur", code: "MN", sortOrder: 15,
      cities: [["Imphal", "इंफाल", 24.8170, 93.9368], ["Thoubal", "थौबल", 24.6333, 94.0167], ["Churachandpur", "चूड़ाचांदपुर", 24.3333, 93.6833]] },
    { name: "Meghalaya", nameHindi: "मेघालय", slug: "meghalaya", code: "ML", sortOrder: 16,
      cities: [["Shillong", "शिलांग", 25.5788, 91.8933], ["Tura", "तुरा", 25.5198, 90.2201], ["Jowai", "जोवाई", 25.4500, 92.2000]] },
    { name: "Mizoram", nameHindi: "मिज़ोरम", slug: "mizoram", code: "MZ", sortOrder: 17,
      cities: [["Aizawl", "आइज़ोल", 23.7271, 92.7176], ["Lunglei", "लुंगलेई", 22.8879, 92.7353], ["Champhai", "चम्फाई", 23.4667, 93.3333]] },
    { name: "Nagaland", nameHindi: "नागालैंड", slug: "nagaland", code: "NL", sortOrder: 18,
      cities: [["Kohima", "कोहिमा", 25.6751, 94.1086], ["Dimapur", "दीमापुर", 25.9091, 93.7267], ["Mokokchung", "मोकोकचुंग", 26.3260, 94.5170]] },
    { name: "Odisha", nameHindi: "ओडिशा", slug: "odisha", code: "OD", sortOrder: 19,
      cities: [["Bhubaneswar", "भुवनेश्वर", 20.2961, 85.8245], ["Cuttack", "कटक", 20.4625, 85.8828], ["Rourkela", "राउरकेला", 22.2604, 84.8536], ["Berhampur", "बरहमपुर", 19.3149, 84.7941]] },
    { name: "Punjab", nameHindi: "पंजाब", slug: "punjab", code: "PB", sortOrder: 20,
      cities: [["Amritsar", "अमृतसर", 31.6340, 74.8723], ["Ludhiana", "लुधियाना", 30.9010, 75.8573], ["Jalandhar", "जालंधर", 31.3260, 75.5762], ["Patiala", "पटियाला", 30.3398, 76.3869], ["Mohali", "मोहाली", 30.7046, 76.7179]] },
    { name: "Rajasthan", nameHindi: "राजस्थान", slug: "rajasthan", code: "RJ", sortOrder: 21,
      cities: [["Jaipur", "जयपुर", 26.9124, 75.7873], ["Jodhpur", "जोधपुर", 26.2389, 73.0243], ["Udaipur", "उदयपुर", 24.5854, 73.7125], ["Kota", "कोटा", 25.2138, 75.8648], ["Ajmer", "अजमेर", 26.4499, 74.6399]] },
    { name: "Sikkim", nameHindi: "सिक्किम", slug: "sikkim", code: "SK", sortOrder: 22,
      cities: [["Gangtok", "गंगटोक", 27.3389, 88.6065], ["Namchi", "नामची", 27.1667, 88.3667], ["Gyalshing", "ग्यालशिंग", 27.2833, 88.2667]] },
    { name: "Tamil Nadu", nameHindi: "तमिलनाडु", slug: "tamil-nadu", code: "TN", sortOrder: 23,
      cities: [["Chennai", "चेन्नई", 13.0827, 80.2707], ["Coimbatore", "कोयंबटूर", 11.0168, 76.9558], ["Madurai", "मदुरै", 9.9252, 78.1198], ["Tiruchirappalli", "तिरुचिरापल्ली", 10.7905, 78.7047], ["Salem", "सेलम", 11.6643, 78.1460]] },
    { name: "Telangana", nameHindi: "तेलंगाना", slug: "telangana", code: "TG", sortOrder: 24,
      cities: [["Hyderabad", "हैदराबाद", 17.3850, 78.4867], ["Warangal", "वारंगल", 17.9689, 79.5941], ["Nizamabad", "निजामाबाद", 18.6725, 78.0941], ["Karimnagar", "करीमनगर", 18.4386, 79.1288]] },
    { name: "Tripura", nameHindi: "त्रिपुरा", slug: "tripura", code: "TR", sortOrder: 25,
      cities: [["Agartala", "अगरतला", 23.8315, 91.2868], ["Udaipur (Tripura)", "उदयपुर (त्रिपुरा)", 23.5333, 91.4833], ["Dharmanagar", "धर्मनगर", 24.3667, 92.1667]] },
    { name: "Uttar Pradesh", nameHindi: "उत्तर प्रदेश", slug: "uttar-pradesh", code: "UP", sortOrder: 26,
      cities: [["Lucknow", "लखनऊ", 26.8467, 80.9462], ["Kanpur", "कानपुर", 26.4499, 80.3319], ["Ghaziabad", "गाज़ियाबाद", 28.6692, 77.4538], ["Agra", "आगरा", 27.1767, 78.0081], ["Varanasi", "वाराणसी", 25.3176, 82.9739], ["Prayagraj", "प्रयागराज", 25.4358, 81.8463], ["Meerut", "मेरठ", 28.9845, 77.7064], ["Noida", "नोएडा", 28.5355, 77.3910]] },
    { name: "Uttarakhand", nameHindi: "उत्तराखंड", slug: "uttarakhand", code: "UK", sortOrder: 27,
      cities: [["Dehradun", "देहरादून", 30.3165, 78.0322], ["Haridwar", "हरिद्वार", 29.9457, 78.1642], ["Roorkee", "रुड़की", 29.8543, 77.8880], ["Haldwani", "हल्द्वानी", 29.2183, 79.5130]] },
    { name: "West Bengal", nameHindi: "पश्चिम बंगाल", slug: "west-bengal", code: "WB", sortOrder: 28,
      cities: [["Kolkata", "कोलकाता", 22.5726, 88.3639], ["Howrah", "हावड़ा", 22.5958, 88.2636], ["Durgapur", "दुर्गापुर", 23.5204, 87.3119], ["Asansol", "आसनसोल", 23.6889, 86.9661], ["Siliguri", "सिलीगुड़ी", 26.7271, 88.3953]] },
    // Union Territories
    { name: "Andaman and Nicobar Islands", nameHindi: "अंडमान और निकोबार द्वीप समूह", slug: "andaman-and-nicobar-islands", code: "AN", sortOrder: 29,
      cities: [["Port Blair", "पोर्ट ब्लेयर", 11.6234, 92.7265]] },
    { name: "Chandigarh", nameHindi: "चंडीगढ़", slug: "chandigarh", code: "CH", sortOrder: 30,
      cities: [["Chandigarh", "चंडीगढ़", 30.7333, 76.7794]] },
    { name: "Dadra and Nagar Haveli and Daman and Diu", nameHindi: "दादरा और नगर हवेली और दमन और दीव", slug: "dadra-nagar-haveli-daman-diu", code: "DN", sortOrder: 31,
      cities: [["Daman", "दमन", 20.3974, 72.8328], ["Diu", "दीव", 20.7144, 70.9874], ["Silvassa", "सिलवासा", 20.2766, 73.0082]] },
    { name: "Delhi", nameHindi: "दिल्ली", slug: "delhi", code: "DL", sortOrder: 32,
      cities: [["New Delhi", "नई दिल्ली", 28.6139, 77.2090], ["Dwarka", "द्वारका", 28.5921, 77.0460], ["Rohini", "रोहिणी", 28.7495, 77.0565], ["Saket", "साकेत", 28.5245, 77.2066]] },
    { name: "Jammu and Kashmir", nameHindi: "जम्मू और कश्मीर", slug: "jammu-and-kashmir", code: "JK", sortOrder: 33,
      cities: [["Srinagar", "श्रीनगर", 34.0837, 74.7973], ["Jammu", "जम्मू", 32.7266, 74.8570], ["Anantnag", "अनंतनाग", 33.7311, 75.1487], ["Baramulla", "बारामूला", 34.2096, 74.3436]] },
    { name: "Ladakh", nameHindi: "लद्दाख", slug: "ladakh", code: "LA", sortOrder: 34,
      cities: [["Leh", "लेह", 34.1526, 77.5771], ["Kargil", "कारगिल", 34.5539, 76.1349]] },
    { name: "Lakshadweep", nameHindi: "लक्षद्वीप", slug: "lakshadweep", code: "LD", sortOrder: 35,
      cities: [["Kavaratti", "कवरत्ती", 10.5669, 72.6420]] },
    { name: "Puducherry", nameHindi: "पुदुचेरी", slug: "puducherry", code: "PY", sortOrder: 36,
      cities: [["Puducherry", "पुदुचेरी", 11.9416, 79.8083], ["Karaikal", "कराईकल", 10.9254, 79.8380], ["Yanam", "यानम", 16.7333, 82.2167]] },
  ] as const;

  function slugify(text: string) {
    return text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[()]/g, "")
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  let stateCount = 0;
  let cityCount = 0;
  for (const s of stateList) {
    const { cities: cityNames, ...stateFields } = s;
    const [insertedState] = await db
      .insert(states)
      .values(stateFields)
      .onConflictDoUpdate({ target: states.slug, set: { name: stateFields.name, nameHindi: stateFields.nameHindi, code: stateFields.code, sortOrder: stateFields.sortOrder } })
      .returning();
    stateCount++;

    for (let i = 0; i < cityNames.length; i++) {
      const [cityName, cityNameHindi, lat, lng] = cityNames[i] as unknown as [string, string, number, number];
      const citySlug = `${slugify(cityName)}-${stateFields.code.toLowerCase()}`;
      await db
        .insert(cities)
        .values({
          stateId: insertedState.id,
          name: cityName,
          nameHindi: cityNameHindi,
          slug: citySlug,
          latitude: lat,
          longitude: lng,
          sortOrder: i + 1,
        })
        .onConflictDoUpdate({ target: cities.slug, set: { latitude: lat, longitude: lng, nameHindi: cityNameHindi } });
      cityCount++;
    }
  }
  console.log("✓ States seeded:", stateCount);
  console.log("✓ Cities seeded:", cityCount);

  // ─── Membership Plans ───────────────────────────────────────────────────────
  const plans = [
    {
      name: "Basic", nameHindi: "बेसिक", slug: "basic",
      description: "Ad-free reading experience",
      price: "99.00", currency: "INR", interval: "monthly" as const,
      durationDays: 30, adFree: true, downloadEnabled: false, prioritySupport: false,
      features: ["Ad-free experience", "All articles access"],
      sortOrder: 1, isPopular: false,
    },
    {
      name: "Premium", nameHindi: "प्रीमियम", slug: "premium",
      description: "Full access with premium features",
      price: "249.00", currency: "INR", interval: "monthly" as const,
      durationDays: 30, adFree: true, downloadEnabled: true, prioritySupport: true,
      features: ["Ad-free experience", "Premium articles", "Download articles", "Priority support"],
      sortOrder: 2, isPopular: true,
    },
    {
      name: "Annual Premium", nameHindi: "वार्षिक प्रीमियम", slug: "annual-premium",
      description: "Best value — save 40%",
      price: "1799.00", currency: "INR", interval: "yearly" as const,
      durationDays: 365, adFree: true, downloadEnabled: true, prioritySupport: true,
      features: ["Ad-free experience", "Premium articles", "Download articles", "Priority support", "40% savings"],
      sortOrder: 3, isPopular: false,
    },
  ];

  for (const plan of plans) {
    await db.insert(membershipPlans).values(plan).onConflictDoNothing();
  }
  console.log("✓ Membership plans seeded:", plans.length);

  // ─── Utility Data (mock) ───────────────────────────────────────────────────
  const utilities = [
    { dataType: "petrol" as const, city: "Delhi", value: "94.72", change: "+0.12", changePercent: "+0.13%", unit: "₹/litre" },
    { dataType: "diesel" as const, city: "Delhi", value: "87.62", change: "+0.08", changePercent: "+0.09%", unit: "₹/litre" },
    { dataType: "gold" as const, city: "National", value: "73,450", change: "+120", changePercent: "+0.16%", unit: "₹/10g" },
    { dataType: "silver" as const, city: "National", value: "92,800", change: "-200", changePercent: "-0.22%", unit: "₹/kg" },
    { dataType: "sensex" as const, city: "National", value: "82,345.67", change: "+234.50", changePercent: "+0.29%", unit: "points" },
    { dataType: "nifty" as const, city: "National", value: "25,012.30", change: "+78.20", changePercent: "+0.31%", unit: "points" },
  ];

  for (const u of utilities) {
    await db.insert(utilityData).values(u).onConflictDoNothing();
  }
  console.log("✓ Utility data seeded:", utilities.length);

  // ─── Revenue Config ─────────────────────────────────────────────────────────
  const zones = [
    "header-leaderboard", "breaking-below", "sidebar-top", "sidebar-middle",
    "in-article-1", "in-article-2", "footer-banner", "category-top",
  ];
  for (const zone of zones) {
    await db.insert(revenueConfig).values({ zone, cpmRate: "0.5000", cpcRate: "2.0000" }).onConflictDoNothing();
  }
  console.log("✓ Revenue config seeded:", zones.length, "zones");

  // ─── Sample Articles (Madhya Pradesh cities, for testing location flow) ─────
  // Re-fetch admin/site since .onConflictDoNothing() above returns no row on re-runs.
  const [seedAdmin] = await db.select().from(users).where(eq(users.email, "admin@news.com")).limit(1);
  const [seedSite] = await db.select().from(sites).where(eq(sites.slug, "the-local-leader")).limit(1);
  const [politicsCategory] = await db.select().from(categories).where(eq(categories.slug, "politics")).limit(1);
  const [nationalCategory] = await db.select().from(categories).where(eq(categories.slug, "national")).limit(1);
  const [sportsCategory] = await db.select().from(categories).where(eq(categories.slug, "sports")).limit(1);

  const sampleArticles = [
    {
      title: "Indore Named Cleanest City in India for Record Streak",
      titleHindi: "इंदौर लगातार बना भारत का सबसे स्वच्छ शहर",
      slug: "indore-cleanest-city-record-streak",
      summary: "Indore retains its top rank in the national cleanliness survey.",
      content: "<p>इंदौर ने एक बार फिर स्वच्छ सर्वेक्षण में देश में पहला स्थान हासिल किया है। नगर निगम के अधिकारियों ने इसे शहरवासियों के सहयोग का नतीजा बताया।</p>",
      categoryId: nationalCategory.id,
      state: "Madhya Pradesh", city: "Indore",
      thumbnailUrl: "https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1200",
      isFeatured: true, isTrending: true,
    },
    {
      title: "New Metro Line Approved for Indore",
      titleHindi: "इंदौर के लिए नई मेट्रो लाइन को मंजूरी",
      slug: "indore-new-metro-line-approved",
      summary: "State government clears the second phase of Indore Metro.",
      content: "<p>मध्य प्रदेश सरकार ने इंदौर मेट्रो के दूसरे चरण को हरी झंडी दे दी है, जिससे शहर के पूर्वी हिस्से को बेहतर कनेक्टिविटी मिलेगी।</p>",
      categoryId: politicsCategory.id,
      state: "Madhya Pradesh", city: "Indore",
      thumbnailUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200",
      isBreaking: true,
    },
    {
      title: "Indore Cricket Academy Produces Two National Selections",
      titleHindi: "इंदौर क्रिकेट अकादमी के दो खिलाड़ियों का राष्ट्रीय टीम में चयन",
      slug: "indore-cricket-academy-national-selections",
      summary: "Two young players from a local Indore academy make the U-19 squad.",
      content: "<p>इंदौर की एक स्थानीय क्रिकेट अकादमी के दो खिलाड़ियों का चयन अंडर-19 राष्ट्रीय टीम में हुआ है, जिससे शहर में खुशी की लहर है।</p>",
      categoryId: sportsCategory.id,
      state: "Madhya Pradesh", city: "Indore",
      thumbnailUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200",
    },
    {
      title: "Bhopal to Host National Investment Summit Next Month",
      titleHindi: "भोपाल में अगले महीने राष्ट्रीय निवेश सम्मेलन",
      slug: "bhopal-national-investment-summit",
      summary: "Madhya Pradesh capital prepares to host industry leaders from across the country.",
      content: "<p>भोपाल में अगले महीने राष्ट्रीय स्तर के निवेश सम्मेलन का आयोजन किया जाएगा, जिसमें देशभर के उद्योगपति भाग लेंगे।</p>",
      categoryId: nationalCategory.id,
      state: "Madhya Pradesh", city: "Bhopal",
      thumbnailUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1200",
      isFeatured: true,
    },
    {
      title: "Bhopal Lake Cleanup Drive Begins Ahead of Monsoon",
      titleHindi: "मानसून से पहले भोपाल की झीलों की सफाई अभियान शुरू",
      slug: "bhopal-lake-cleanup-monsoon",
      summary: "Civic body launches cleanup of the Upper and Lower Lakes.",
      content: "<p>नगर निगम भोपाल ने मानसून से पहले बड़ी झील और छोटी झील की सफाई का अभियान शुरू किया है।</p>",
      categoryId: nationalCategory.id,
      state: "Madhya Pradesh", city: "Bhopal",
      thumbnailUrl: "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=1200",
    },
    {
      title: "Gwalior Fort Restoration Project Enters Final Phase",
      titleHindi: "ग्वालियर किले का जीर्णोद्धार कार्य अंतिम चरण में",
      slug: "gwalior-fort-restoration-final-phase",
      summary: "Archaeological Survey of India nears completion of heritage restoration work.",
      content: "<p>भारतीय पुरातत्व सर्वेक्षण द्वारा ग्वालियर किले के जीर्णोद्धार का कार्य अब अंतिम चरण में पहुंच गया है।</p>",
      categoryId: nationalCategory.id,
      state: "Madhya Pradesh", city: "Gwalior",
      thumbnailUrl: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200",
    },
  ];

  let articleCount = 0;
  if (seedAdmin && politicsCategory && nationalCategory && sportsCategory) {
    for (const a of sampleArticles) {
      await db.insert(articles).values({
        ...a,
        authorId: seedAdmin.id,
        siteId: seedSite?.id,
        status: "published",
        publishedAt: new Date(),
        contentType: "article",
      }).onConflictDoNothing({ target: articles.slug });
      articleCount++;
    }
  }
  console.log("✓ Sample articles seeded:", articleCount);

  console.log("\n✅ Seed completed successfully!");
  console.log("   Admin login: admin@news.com / admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
