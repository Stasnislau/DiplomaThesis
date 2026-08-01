import i18n from "@/config/i18n";
import { lookupLesson } from "@/config/learningPathLessons";

const ISO_TO_LANG_KEY: Record<string, string> = {
  en: "english",
  pl: "polish",
  es: "spanish",
  ru: "russian",
  fr: "french",
  de: "german",
  it: "italian",
};
const LEGACY_LANG_PREFIX_TO_KEY: Array<[string, string]> = [
  ["polis", "polish"],
  ["polish", "polish"],
  ["spani", "spanish"],
  ["spanish", "spanish"],
  ["russi", "russian"],
  ["russian", "russian"],
  ["germa", "german"],
  ["german", "german"],
  ["frenc", "french"],
  ["french", "french"],
  ["itali", "italian"],
  ["italian", "italian"],
  ["engli", "english"],
  ["english", "english"],
];

export function languageDisplayCode(stored: string | null | undefined): string {
  if (!stored) return "";
  const lower = stored.toLowerCase();
  if (lower.length === 2 && ISO_TO_LANG_KEY[lower]) return lower.toUpperCase();
  for (const [prefix, key] of LEGACY_LANG_PREFIX_TO_KEY) {
    if (lower.startsWith(prefix)) {
      const isoEntry = Object.entries(ISO_TO_LANG_KEY).find(
        ([, k]) => k === key,
      );
      if (isoEntry) return isoEntry[0].toUpperCase();
    }
  }
  return stored.toUpperCase();
}

export function getLocalizedLanguageName(
  stored: string | null | undefined,
): string {
  if (!stored) return "";
  const lower = stored.toLowerCase();
  let key: string | undefined =
    lower.length === 2 ? ISO_TO_LANG_KEY[lower] : undefined;
  if (!key) {
    const legacy = LEGACY_LANG_PREFIX_TO_KEY.find(([prefix]) =>
      lower.startsWith(prefix),
    );
    if (legacy) key = legacy[1];
  }
  if (!key) return stored;
  return i18n.t(`languages.${key}`, { defaultValue: stored });
}

export function slugifyKey(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, i) =>
      i === 0
        ? part.toLowerCase()
        : part[0].toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("");
}

export function getLocalizedAchievement(
  englishName: string,
  englishDescription: string,
): { name: string; description: string } {
  const slug = slugifyKey(englishName);
  const name = i18n.t(`achievements.byName.${slug}.name`, {
    defaultValue: englishName,
  });
  const description = i18n.t(`achievements.byName.${slug}.description`, {
    defaultValue: englishDescription,
  });
  return { name, description };
}

export function getLocalizedTheme(englishTheme: string): string {
  if (!englishTheme) return englishTheme;
  const slug = slugifyKey(englishTheme);
  return i18n.t(`learningPath.themes.${slug}`, {
    defaultValue: englishTheme,
  });
}

export function getLocalizedLessonType(type: string): string {
  if (!type) return type;
  return i18n.t(`learningPath.lessonTypes.${type.toLowerCase()}`, {
    defaultValue: type,
  });
}

export function getLocalizedModuleTitle(rawTitle: string): string {
  const match = /^Unit\s+(\d+):\s*(.+)$/.exec(rawTitle);
  if (!match) return rawTitle;
  const [, number, englishTheme] = match;
  return i18n.t("learningPath.moduleTitlePattern", {
    n: number,
    theme: getLocalizedTheme(englishTheme),
    defaultValue: rawTitle,
  });
}

export function getLocalizedLesson(
  englishTitle: string,
  englishDescription: string,
): { title: string; description: string } {
  const slug = slugifyKey(englishTitle);
  const lesson = lookupLesson(slug, i18n.language);
  return {
    title: lesson?.title ?? englishTitle,
    description: lesson?.description ?? englishDescription,
  };
}

export function getLocalizedModuleDescription(
  rawDescription: string,
): string {
  const match =
    /^Explore\s+(.+?)\s+and build solid\s+([A-C][12])\s+competency\.?$/.exec(
      rawDescription,
    );
  if (!match) return rawDescription;
  const [, englishThemeLower, level] = match;
  return i18n.t("learningPath.moduleDescriptionPattern", {
    theme: getLocalizedTheme(
      englishThemeLower,
    ),
    level,
    defaultValue: rawDescription,
  });
}
