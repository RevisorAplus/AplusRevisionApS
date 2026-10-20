import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { seoFor } from "../seo";

function saetMeta(navn: string, indhold: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.head.querySelector(`meta[${attr}="${navn}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, navn);
    document.head.appendChild(el);
  }
  el.setAttribute("content", indhold);
}

function saetCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function Seo() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const side = seoFor(pathname, language);

  useLayoutEffect(() => {
    document.title = side.title;
    document.documentElement.lang = language;
    saetMeta("description", side.description);
    saetMeta("robots", side.robots);
    saetCanonical(side.canonical);
    saetMeta("og:title", side.title, true);
    saetMeta("og:description", side.description, true);
    saetMeta("og:url", side.canonical, true);
    saetMeta("og:type", "website", true);
    saetMeta("og:locale", language === "en" ? "en_GB" : "da_DK", true);
    saetMeta("og:image", "https://www.aplusrevision.dk/aplus-revision-logo.png", true);
  }, [side.title, side.description, side.robots, side.canonical, language]);

  return null;
}
