import { getServerTranslator } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getServerTranslator();
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4"
      aria-label={t("common.loading", "Loading")}
    >
      <div className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
        <div
          className="absolute inset-0 rounded-full border-[5px] border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin"
          style={{ animationDuration: "0.8s" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 rounded-full border-[5px] border-transparent border-t-[var(--color-primary)] opacity-30 animate-spin"
          style={{ animationDuration: "1.2s", animationDirection: "reverse" }}
          aria-hidden
        />
        <img
          src="/intro/logo.png"
          alt=""
          width={72}
          height={72}
          className="relative z-10 h-16 w-16 object-contain sm:h-[4.5rem] sm:w-[4.5rem]"
          decoding="async"
        />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-[var(--color-foreground)]">
          {t("common.loading", "Loading")}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("common.pleaseWait", "Please wait...")}
        </p>
      </div>
      <div className="flex gap-1.5">
        <span
          className="loading-dot h-2 w-2 rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: "0s" }}
        />
        <span
          className="loading-dot h-2 w-2 rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: "0.16s" }}
        />
        <span
          className="loading-dot h-2 w-2 rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: "0.32s" }}
        />
      </div>
    </div>
  );
}
