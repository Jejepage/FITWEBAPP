// Quelle für Formularwerte: URL-Parameter (Vorschau) oder FormData (Speichern).

/**
 * Liest einzelne Werte; `alle` liefert zusätzlich alle Werte eines mehrfach vorkommenden Felds
 * (Häkchen mit gleichem Namen). Einfache Funktionen ohne `alle` sind erlaubt (Tests).
 */
export type Quelle = ((name: string) => string | undefined) & {
  alle?: (name: string) => string[];
};

export const quelleAusSearchParams = (sp: Record<string, string | string[] | undefined>): Quelle =>
  Object.assign(
    (name: string) => {
      const v = sp[name];
      return Array.isArray(v) ? v[0] : v;
    },
    {
      alle: (name: string): string[] => {
        const v = sp[name];
        return Array.isArray(v) ? v : v === undefined ? [] : [v];
      },
    },
  );

export const quelleAusFormData = (fd: FormData): Quelle =>
  Object.assign(
    (name: string) => {
      const v = fd.get(name);
      return typeof v === "string" ? v : undefined;
    },
    {
      alle: (name: string): string[] =>
        fd.getAll(name).filter((v): v is string => typeof v === "string"),
    },
  );
