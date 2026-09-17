// Seeds realistic shok-sandesh (obituary) entries across all 6 types, for
// UI/filter testing. Marked in `notes`-adjacent fields aren't available on
// this table, so removal is tracked via a dedicated cleanup flag instead —
// see cleanup-shok-sandesh.ts.
import "dotenv/config";
import { db } from "../src/config/db.js";
import { shokSandesh, sites } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const TARGET_SITE_SLUG = process.env.LOAD_TEST_SITE_SLUG || "bazar-karobar";

const CITIES = [
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Patna", state: "Bihar" },
  { city: "Mumbai", state: "Maharashtra" },
];

const ENTRIES = [
  {
    type: "shok_sandesh" as const,
    deceasedName: "Ramesh Chandra Sharma",
    deceasedNameHindi: "रमेश चंद्र शर्मा",
    deceasedAge: 78,
    familyName: "Sharma Family",
    familyNameHindi: "शर्मा परिवार",
    message: "It is with profound sorrow that we announce the passing of our beloved father and grandfather. He will be deeply missed by all who knew him.",
    messageHindi: "अत्यंत दुख के साथ सूचित किया जाता है कि हमारे पूजनीय पिता और दादाजी का निधन हो गया है। वे सदैव हमारी स्मृतियों में रहेंगे।",
  },
  {
    type: "shradhanjali" as const,
    deceasedName: "Kamla Devi",
    deceasedNameHindi: "कमला देवी",
    deceasedAge: 82,
    familyName: "Agrawal Family",
    familyNameHindi: "अग्रवाल परिवार",
    message: "A tribute to a life dedicated to family and community service. Her warmth and generosity touched everyone she met.",
    messageHindi: "परिवार और समाज सेवा को समर्पित एक जीवन को श्रद्धांजलि। उनकी सरलता और उदारता सभी को छू गई।",
  },
  {
    type: "punyatithi" as const,
    deceasedName: "Dr. Vinod Kumar Gupta",
    deceasedNameHindi: "डॉ. विनोद कुमार गुप्ता",
    deceasedAge: 65,
    familyName: "Gupta Family",
    familyNameHindi: "गुप्ता परिवार",
    message: "On his death anniversary, we remember the invaluable contribution he made as a physician serving our community for over three decades.",
    messageHindi: "पुण्यतिथि पर हम उन्हें याद करते हैं, जिन्होंने तीन दशकों से अधिक समय तक हमारे समाज की एक चिकित्सक के रूप में अमूल्य सेवा की।",
    eventDate: true,
    eventPlace: "Community Hall, Station Road",
  },
  {
    type: "uthavna" as const,
    deceasedName: "Manohar Lal Joshi",
    deceasedNameHindi: "मनोहर लाल जोशी",
    deceasedAge: 71,
    familyName: "Joshi Family",
    familyNameHindi: "जोशी परिवार",
    message: "The Uthavna ceremony will be held at the family residence. All relatives and friends are respectfully invited to pay their last respects.",
    messageHindi: "उठावने की रस्म पारिवारिक निवास पर आयोजित की जाएगी। सभी संबंधी और मित्रगण अंतिम श्रद्धांजलि अर्पित करने हेतु सादर आमंत्रित हैं।",
    eventDate: true,
    eventPlace: "Family Residence, Civil Lines",
  },
  {
    type: "terahvi" as const,
    deceasedName: "Sushila Bai Patel",
    deceasedNameHindi: "सुशीला बाई पटेल",
    deceasedAge: 89,
    familyName: "Patel Family",
    familyNameHindi: "पटेल परिवार",
    message: "The Terahvi ceremony will be observed with a community feast. Your presence and blessings would mean a great deal to our family.",
    messageHindi: "तेरहवीं संस्कार सामुदायिक भोज के साथ मनाया जाएगा। आपकी उपस्थिति और आशीर्वाद हमारे परिवार के लिए अत्यंत महत्वपूर्ण होगा।",
    eventDate: true,
    eventPlace: "Shanti Bhavan, Main Market",
  },
  {
    type: "smriti_sandesh" as const,
    deceasedName: "Colonel (Retd.) Ashok Singh Rathore",
    deceasedNameHindi: "कर्नल (सेवानिवृत्त) अशोक सिंह राठौर",
    deceasedAge: 74,
    familyName: "Rathore Family",
    familyNameHindi: "राठौर परिवार",
    message: "In loving memory of a decorated soldier and devoted family man. His courage and integrity remain an inspiration to us all.",
    messageHindi: "एक सम्मानित सैनिक और समर्पित परिवारजन की स्मृति में। उनका साहस और सत्यनिष्ठा हम सभी के लिए प्रेरणास्रोत बनी रहेगी।",
  },
  // A second wave, different names/cities, to give filters (city/age/type) something to actually filter
  {
    type: "shok_sandesh" as const,
    deceasedName: "Prakash Chandra Verma",
    deceasedNameHindi: "प्रकाश चंद्र वर्मा",
    deceasedAge: 56,
    familyName: "Verma Family",
    familyNameHindi: "वर्मा परिवार",
    message: "With heavy hearts, we share the sudden demise of our beloved brother and friend. He will be remembered for his kindness and cheerful spirit.",
    messageHindi: "भारी मन से हम अपने प्रिय भाई और मित्र के आकस्मिक निधन की सूचना दे रहे हैं। उनकी दयालुता और हंसमुख स्वभाव सदैव याद रहेगा।",
  },
  {
    type: "shradhanjali" as const,
    deceasedName: "Meera Bai Chauhan",
    deceasedNameHindi: "मीरा बाई चौहान",
    deceasedAge: 91,
    familyName: "Chauhan Family",
    familyNameHindi: "चौहान परिवार",
    message: "A century-spanning life of devotion and grace. She leaves behind four generations who cherish her memory.",
    messageHindi: "भक्ति और सौम्यता से भरा एक शताब्दी जैसा जीवन। वे चार पीढ़ियों को अपनी यादों की धरोहर सौंप गईं।",
  },
  {
    type: "punyatithi" as const,
    deceasedName: "Harish Chandra Mishra",
    deceasedNameHindi: "हरीश चंद्र मिश्रा",
    deceasedAge: 68,
    familyName: "Mishra Family",
    familyNameHindi: "मिश्रा परिवार",
    message: "Remembering a dedicated teacher who shaped the lives of thousands of students over his 40-year career.",
    messageHindi: "एक समर्पित शिक्षक को याद करते हुए, जिन्होंने अपने 40 वर्षों के करियर में हजारों छात्रों के जीवन को संवारा।",
    eventDate: true,
    eventPlace: "Saraswati Vidya Mandir, School Ground",
  },
];

async function main() {
  console.log("Seeding shok-sandesh entries...\n");

  const [site] = await db.select().from(sites).where(eq(sites.slug, TARGET_SITE_SLUG)).limit(1);
  if (!site) throw new Error(`Site "${TARGET_SITE_SLUG}" not found`);
  console.log(`Seeding for site: ${site.name} (id ${site.id})\n`);

  let created = 0;
  const now = Date.now();

  for (let i = 0; i < ENTRIES.length; i++) {
    const e = ENTRIES[i];
    const loc = CITIES[i % CITIES.length];
    const daysAgo = i * 3;
    const dateOfDeath = new Date(now - (daysAgo + 10) * 24 * 3600_000);
    const eventDate = e.eventDate ? new Date(now - daysAgo * 24 * 3600_000 + 2 * 24 * 3600_000) : undefined;

    await db.insert(shokSandesh).values({
      siteId: site.id,
      type: e.type,
      deceasedName: e.deceasedName,
      deceasedNameHindi: e.deceasedNameHindi,
      deceasedAge: e.deceasedAge,
      dateOfDeath,
      place: loc.city,
      city: loc.city,
      state: loc.state,
      familyName: e.familyName,
      familyNameHindi: e.familyNameHindi,
      message: e.message,
      messageHindi: e.messageHindi,
      eventDetails: e.eventDate ? "Ceremony details as announced by the family." : undefined,
      eventDetailsHindi: e.eventDate ? "परिवार द्वारा घोषित समारोह विवरण के अनुसार।" : undefined,
      eventDate,
      eventPlace: e.eventPlace,
      packageType: "basic_text",
      status: "approved",
      paymentStatus: i % 3 === 0 ? "due" : "paid",
      publishedAt: new Date(now - daysAgo * 24 * 3600_000),
    } as any);
    created++;
  }

  console.log(`✓ Shok-sandesh entries seeded: ${created}`);
  console.log("\nDone. Run `npm run cleanup:shok-sandesh` to remove all seeded rows for this site.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
