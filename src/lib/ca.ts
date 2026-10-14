/** Contract address du coin, réglé par la variable `CA` (Railway). Absente : rien ne s'affiche. */
export function getCa(): string | null {
  return process.env.CA?.trim() || null;
}
