import { IconPlay } from "@/components/icons";
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
      className={`press inline-flex min-h-12 select-none items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-hero-from to-hero-to px-5 py-2.5 text-[17px] font-semibold leading-tight text-on-accent shadow-card hover:brightness-110 ${className}`}
    >
      <span
        aria-hidden="true"
        className="grid size-7 place-items-center rounded-full bg-on-accent/20"
      >
        <IconPlay className="ml-0.5 size-4" />
      </span>
      {de.katalog.videoAnsehen}
      <span className="sr-only"> ({de.katalog.videoHinweis})</span>
    </a>
  );
}
