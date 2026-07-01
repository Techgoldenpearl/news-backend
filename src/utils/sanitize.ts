import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
  "strong", "em", "u", "s", "code", "pre", "blockquote",
  "ul", "ol", "li", "a", "img", "iframe", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "sub", "sup",
];

const ALLOWED_ATTRS = [
  "href", "src", "alt", "title", "class", "id", "style",
  "width", "height", "target", "rel", "frameborder", "allowfullscreen",
  "loading", "data-*",
];

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOW_DATA_ATTR: true,
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allowfullscreen", "frameborder", "allow"],
  });
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}
