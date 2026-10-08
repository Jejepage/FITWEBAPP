import { knopfSekundaer } from "@/components/ui";
import { videoLink } from "@/domain/youtube";
import { de } from "@/i18n/de";

/**
 * Knopf "Video ansehen": öffnet das YouTube-Video in einem neuen Tab (auf dem iPhone meist in der
 * YouTube-App). Der gespeicherte Wert wird vor dem Anzeigen noch einmal geprüft und in die
 * Standardadresse umgebaut; ohne gültigen Link erscheint nichts.
 */
export function VideoKnopf({
  url,
  className = "",
}: {
  url: string | null | undefined;
  className?: string;
}) {
  const link = videoLink(url);
  if (!link) return null;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${knopfSekundaer} gap-2 ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
      </svg>
      {de.katalog.videoAnsehen}
      <span className="sr-only"> ({de.katalog.videoHinweis})</span>
    </a>
  );
}
