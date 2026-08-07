import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, type Lang } from "@/lib/i18n/dictionary";

export default function NotFound() {
  const cookieLang = cookies().get("lang")?.value;
  const lang: Lang = cookieLang === "en" ? "en" : "no";
  const t = getDictionary(lang);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl font-bold text-white">{t.notFound.title}</h1>
      <p className="text-gray-400">{t.notFound.description}</p>
      <Link
        href="/"
        className="px-6 py-2 bg-brand-navy hover:bg-brand-navy-dark rounded-xl text-white font-medium transition-colors"
      >
        {t.notFound.backToStart}
      </Link>
    </main>
  );
}
