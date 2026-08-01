import Link from "next/link";

export const metadata = {
  title: "Personvern – AEROUTE",
};

export default function PersonvernPage() {
  return (
    <main className="min-h-screen flex flex-col items-center p-4 bg-white">
      <div className="w-full max-w-2xl py-10 space-y-8 text-sm text-gray-700 leading-relaxed">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900">Personvernerklæring</h1>
          <p className="text-gray-400 text-xs">Sist oppdatert august 2026</p>
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">1. Behandlingsansvarlig</h2>
          <p>
            Sprocket AS (org.nr. 937 706 723) er behandlingsansvarlig for personopplysningene som
            samles inn gjennom AEROUTE. Spørsmål om personvern kan rettes til{" "}
            <a href="mailto:mikkelolsson@hotmail.com" className="text-blue-600 hover:underline">
              mikkelolsson@hotmail.com
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">2. Hvilke opplysninger vi behandler</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-gray-800">Kontoopplysninger:</span> e-postadresse og
              passord (lagret av vår autentiseringsleverandør Supabase, passord er hashet og ikke
              lesbart for oss).
            </li>
            <li>
              <span className="font-medium text-gray-800">Ruteopplysninger:</span> GPS-koordinater,
              distanse, høydeprofil og idrett for ruter du laster opp eller lagrer.
            </li>
            <li>
              <span className="font-medium text-gray-800">Tredjepartsimport:</span> hvis du kobler til
              Strava, mottar vi en aktivitets-ID og de aktivitetene/rutene du velger å importere. Vi
              lagrer ikke Strava-passordet ditt — tilkoblingen skjer via Stravas offisielle
              innloggingsside (OAuth).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">3. Hvorfor vi behandler opplysningene</h2>
          <p>
            Opplysningene brukes til å levere selve tjenesten: vise værvarsel langs ruten din,
            lagre og administrere dine ruter, og tilpasse funksjoner som fartsslider og smøretips
            til idretten du velger. Behandlingsgrunnlaget er avtale (personopplysningsloven/GDPR
            art. 6 (1) b) for kontoen din, og samtykke (art. 6 (1) a) når du aktivt kobler til
            Strava.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">4. Hvem vi deler opplysninger med</h2>
          <p>Vi deler ikke opplysninger for markedsføringsformål. Følgende databehandlere brukes for å drifte tjenesten:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Supabase — konto, innlogging og database.</li>
            <li>Vercel — hosting av nettsiden.</li>
            <li>MET Norway (api.met.no) — værdata basert på koordinater og tidspunkt (ikke personopplysninger).</li>
            <li>Strava — kun hvis du selv velger å koble til kontoen din.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">5. Informasjonskapsler (cookies)</h2>
          <p>
            AEROUTE bruker kun nødvendige informasjonskapsler som kreves for at tjenesten skal
            fungere: én for å holde deg innlogget (Supabase), og korte, midlertidige cookies som
            brukes under selve Strava-tilkoblingen. Disse er unntatt samtykkekravet i ekomloven
            §2-7b fordi de er strengt nødvendige for funksjonaliteten du har bedt om. Vi bruker
            ingen cookies til analyse, sporing eller markedsføring.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">6. Lagringstid</h2>
          <p>
            Ruter lagres til du selv sletter dem eller sletter kontoen din. Værdata mellomlagres
            midlertidig og slettes automatisk når de blir utdaterte. Tilgangsnøkler fra Strava
            lagres kun så lenge nødvendig for å hente aktiviteten du ber om, og slettes umiddelbart
            når du kobler fra Strava-kontoen din. Ruter du allerede har importert og lagret blir
            liggende på kontoen din som dine egne ruter selv om du kobler fra Strava — de slettes
            kun hvis du selv sletter dem.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-gray-900">7. Dine rettigheter</h2>
          <p>
            Du har rett til innsyn i, retting av og sletting av dine personopplysninger. Kontakt{" "}
            <a href="mailto:mikkelolsson@hotmail.com" className="text-blue-600 hover:underline">
              mikkelolsson@hotmail.com
            </a>{" "}
            for å benytte deg av disse rettighetene. Du kan også klage til Datatilsynet
            (datatilsynet.no) dersom du mener behandlingen er i strid med regelverket.
          </p>
        </section>

        <Link href="/" className="inline-block text-blue-600 hover:underline text-sm">
          ← Tilbake til forsiden
        </Link>
      </div>
    </main>
  );
}
