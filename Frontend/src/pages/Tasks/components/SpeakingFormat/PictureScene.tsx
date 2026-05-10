import { useState } from "react";
import { useTranslation } from "react-i18next";
import cn from "@/utils/cn";

interface PictureSceneProps {
  imageUrl: string;
  /** Plain-text caption used as alt-text and as the visual fallback
   *  when the image fails to load (network error, Pollinations 500,
   *  ad blocker that nukes external images, etc.). */
  caption: string;
}

/**
 * Picture-description prompt renderer. Pollinations.ai serves the
 * actual image directly from a GET URL — no API key, no preflight,
 * just a slow-ish first byte while their backend renders the scene.
 *
 * UX:
 *  - Render the image at native aspect ratio with rounded corners.
 *  - Show a shimmer/spinner over a 4:3 placeholder while it loads.
 *  - On load failure, swap to the text caption so the practice
 *    flow doesn't get blocked just because an external service blipped.
 *  - The caption is hidden by default once the image renders, but
 *    a small "Show description" toggle reveals it for accessibility.
 */
const PictureScene = ({ imageUrl, caption }: PictureSceneProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [showCaption, setShowCaption] = useState(false);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-800",
          status === "ok" ? "bg-transparent" : "bg-gray-100 dark:bg-gray-800",
        )}
        style={{ aspectRatio: "4 / 3" }}
      >
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <div className="w-10 h-10 mb-2 rounded-full border-4 border-indigo-300 border-t-transparent animate-spin" />
            <span>
              {t("tasks.renderingImage", {
                defaultValue: "Generating image…",
              })}
            </span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
            <span className="text-3xl mb-2">🖼️</span>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("tasks.imageFailed", {
                defaultValue: "Couldn't load the image — describe this scene instead:",
              })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {caption}
            </p>
          </div>
        )}
        <img
          src={imageUrl}
          alt={caption}
          loading="eager"
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            status === "ok" ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {status === "ok" && (
        <div>
          <button
            type="button"
            onClick={() => setShowCaption((s) => !s)}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showCaption
              ? t("tasks.hideDescription", {
                  defaultValue: "Hide description",
                })
              : t("tasks.showDescription", {
                  defaultValue: "Show description",
                })}
          </button>
          {showCaption && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed">
              {caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PictureScene;
