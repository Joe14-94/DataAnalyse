const FORMATTER_CACHE = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

export const getCachedNumberFormat = (options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = `num:${JSON.stringify(options)}`;
  let f = FORMATTER_CACHE.get(key) as Intl.NumberFormat;
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', options);
    FORMATTER_CACHE.set(key, f);
  }
  return f;
};

export const getCachedDateTimeFormat = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = `date:${JSON.stringify(options)}`;
  let f = FORMATTER_CACHE.get(key) as Intl.DateTimeFormat;
  if (!f) {
    f = new Intl.DateTimeFormat('fr-FR', options);
    FORMATTER_CACHE.set(key, f);
  }
  return f;
};
