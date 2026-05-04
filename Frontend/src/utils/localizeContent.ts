/**
 * Localize backend-sourced content (achievement names, learning-path
 * themes, etc.) without round-tripping through the API. The backend
 * stores these strings in English; this module turns them into stable
 * keys (camelCase slugs) and looks them up in the i18n catalog. If a
 * translation is missing, the original English string is returned —
 * always safe to call.
 */
import i18n from "@/config/i18n";
import { lookupLesson } from "@/config/learningPathLessons";

/** "Grammar Guru" → "grammarGuru". Strips diacritics so French/Polish
 *  themes also produce ASCII-only keys. */
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

/** Translate an achievement's English name + description into the
 *  current UI language. Falls back to the originals when the catalog
 *  doesn't have an entry yet. */
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

/** Bridge produces module.theme straight from the curriculum ("Family
 *  & Relationships"). Translate the theme via slug; English fallback
 *  preserves the original look when a theme is missing. */
export function getLocalizedTheme(englishTheme: string): string {
  if (!englishTheme) return englishTheme;
  const slug = slugifyKey(englishTheme);
  return i18n.t(`learningPath.themes.${slug}`, {
    defaultValue: englishTheme,
  });
}

/** Translate "vocabulary" / "grammar" / "speaking" labels on lesson
 *  cards. Unknown types fall back to the raw key. */
export function getLocalizedLessonType(type: string): string {
  if (!type) return type;
  return i18n.t(`learningPath.lessonTypes.${type.toLowerCase()}`, {
    defaultValue: type,
  });
}

/** Bridge formats module.title as "Unit {N}: {theme}". Re-emit it via
 *  i18n so the connector word ("Unit") and the theme are both in the
 *  user's language. If the input doesn't match the expected pattern
 *  (e.g. someone changed the backend), return it unchanged. */
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

/** Translate a lesson card's title + description. The lookup table
 *  in `learningPathLessons.ts` keys by camelCase slug of the English
 *  title. If the slug isn't there, the raw English from Bridge is
 *  returned unchanged so a missing entry never breaks the UI. */
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

/** Bridge formats module.description as
 *  "Explore {theme.lower()} and build solid {LEVEL} competency.". */
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
      // Re-capitalise for slug matching ("family & relationships" →
      // "Family & Relationships" produces the same slug regardless of
      // case, so any reasonable form works).
      englishThemeLower,
    ),
    level,
    defaultValue: rawDescription,
  });
}
