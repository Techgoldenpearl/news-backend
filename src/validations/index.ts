import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().max(320),
  phone: z.string().max(20).optional(),
  password: z.string().min(8).max(128),
  loginMethod: z.enum(["email", "google", "phone"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  preferences: z.object({
    categories: z.array(z.string()),
    locations: z.array(z.string()),
  }).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const articleCreateSchema = z.object({
  title: z.string().min(3).max(500),
  titleHindi: z.string().max(500).optional(),
  slug: z.string().min(3).max(500),
  summary: z.string().max(2000).optional(),
  content: z.string().min(1),
  categoryId: z.number().int().positive(),
  siteId: z.number().int().positive().nullable().optional(),
  contentType: z.enum(["article", "video", "explainer", "webstory", "epaper"]).optional(),
  videoUrl: z.string().url().max(1000).optional().or(z.literal("")),
  videoType: z.enum(["youtube", "direct", "none"]).optional(),
  thumbnailUrl: z.string().max(1000).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "scheduled", "archived"]).optional(),
  isBreaking: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  state: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  metaTitle: z.string().max(200).optional().or(z.literal("")),
  metaDescription: z.string().max(500).optional().or(z.literal("")),
  ogImage: z.string().max(1000).optional().or(z.literal("")),
  readTimeMinutes: z.number().int().min(1).max(60).nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
});

export const articleUpdateSchema = articleCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().min(2).max(200),
  nameHindi: z.string().max(200).optional(),
  slug: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  color: z.string().max(20).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
  siteId: z.number().int().positive().nullable().optional(),
  showInNav: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const siteCreateSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100),
  domain: z.string().max(300).optional(),
  subdomain: z.string().max(100).optional(),
  logoUrl: z.string().max(1000).optional(),
  faviconUrl: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
  language: z.string().max(10).optional(),
  region: z.string().max(100).optional(),
  theme: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    headerBg: z.string(),
    fontFamily: z.string(),
    navStyle: z.string(),
  }).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  seoDefaults: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const mediaUploadSchema = z.object({
  base64: z.string().min(1),
  fileName: z.string().max(500).optional(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

export const commentCreateSchema = z.object({
  articleId: z.number().int().positive(),
  content: z.string().min(1).max(5000),
  parentId: z.number().int().positive().nullable().optional(),
});

export const reporterRegisterSchema = z.object({
  name: z.string().min(2).max(200),
  nameHindi: z.string().max(200).optional(),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional(),
  designation: z.string().max(100).optional(),
  beat: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  bio: z.string().max(2000).optional(),
});

export const advertiserRegisterSchema = z.object({
  companyName: z.string().min(2).max(200),
  contactName: z.string().min(2).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional(),
  gstNumber: z.string().max(50).optional(),
  website: z.string().url().max(500).optional(),
});

export const membershipSubscribeSchema = z.object({
  planId: z.number().int().positive(),
  paymentId: z.string().max(200).optional(),
  paymentProvider: z.string().max(50).optional(),
  paymentAmount: z.string().optional(),
});

export const membershipPlanSchema = z.object({
  name: z.string().min(2).max(200),
  nameHindi: z.string().max(200).optional(),
  slug: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  price: z.string(),
  currency: z.string().max(10).optional(),
  interval: z.enum(["monthly", "quarterly", "half_yearly", "yearly", "lifetime"]),
  durationDays: z.number().int().positive(),
  features: z.array(z.string()).optional(),
  maxArticlesPerDay: z.number().int().positive().nullable().optional(),
  adFree: z.boolean().optional(),
  downloadEnabled: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isPopular: z.boolean().optional(),
});

export const adCreateSchema = z.object({
  name: z.string().min(2).max(200),
  zone: z.string(),
  type: z.enum(["image", "html", "script", "text"]).optional(),
  imageUrl: z.string().max(1000).optional(),
  linkUrl: z.string().url().max(1000).optional(),
  htmlContent: z.string().optional(),
  altText: z.string().max(500).optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  deviceTarget: z.enum(["all", "desktop", "mobile"]).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  status: z.enum(["active", "paused", "expired"]).optional(),
  siteId: z.number().int().positive().nullable().optional(),
});

export const pageLayoutSchema = z.object({
  siteId: z.number().int().positive(),
  pageType: z.string().min(1).max(50),
  sections: z.array(z.record(z.string(), z.any())),
});

export const epaperIssueCreateSchema = z.object({
  siteId: z.number().int().positive(),
  issueDate: z.coerce.date(),
  coverImageUrl: z.string().max(1000).optional(),
  pdfUrl: z.string().max(1000).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const epaperIssueUpdateSchema = epaperIssueCreateSchema.partial().omit({ siteId: true });

export const epaperPageAddSchema = z.object({
  pages: z.array(z.object({
    pageNumber: z.number().int().positive(),
    imageUrl: z.string().max(1000).min(1),
    thumbnailUrl: z.string().max(1000).optional(),
  })).min(1),
});

export const epaperPageReorderSchema = z.object({
  pages: z.array(z.object({
    id: z.number().int().positive(),
    pageNumber: z.number().int().positive(),
  })).min(1),
});
