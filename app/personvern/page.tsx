import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, type Lang } from "@/lib/i18n/dictionary";

export const metadata = {
  title: "Personvern – AEROUTE",
};

const CONTACT_EMAIL = "mikkelolsson@hotmail.com";

export default function PersonvernPage() {
  const cookieLang = cookies().get("lang")?.value;
  const lang: Lang = cookieLang === "en" ? "en" : "no";
  const t = getDictionary(lang);

  return (
    <main className="min-h-screen flex flex-col items-center p-4 bg-white">
      <div className="w-full max-w-2xl py-10 space-y-8 text-sm text-gray-700 leading-relaxed">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">{t.personvern.title}</h1>
          <p className="text-gray-400 text-xs">{t.personvern.lastUpdated}</p>
        </div>

        {t.personvern.sections.map((section, si) => {
          const showMailtoAfterFirstParagraph = si === 0 || section.heading.startsWith("7.");

          return (
            <section key={section.heading} className="space-y-2">
              <h2 className="font-semibold text-gray-900">{section.heading}</h2>

              {"body" in section &&
                section.body?.map((paragraph, pi) => (
                  <p key={pi}>
                    {paragraph}
                    {showMailtoAfterFirstParagraph && pi === 0 && (
                      <>
                        {" "}
                        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-navy hover:underline">
                          {CONTACT_EMAIL}
                        </a>
                        {si === 0 ? "." : ""}
                      </>
                    )}
                  </p>
                ))}

              {"list" in section && section.list && (
                <ul className="list-disc pl-5 space-y-1">
                  {section.list.map((item, li) => (
                    <li key={li}>
                      {"title" in item && item.title && (
                        <span className="font-medium text-gray-800">{item.title}</span>
                      )}
                      {"title" in item && item.title ? " " : ""}
                      {item.body}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <Link href="/" className="inline-block text-brand-navy hover:underline text-sm">
          {t.nav.backToFront}
        </Link>
      </div>
    </main>
  );
}
