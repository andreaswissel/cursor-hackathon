import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function ImprintPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-lg font-semibold">Impressum</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h2 className="text-xl font-semibold mt-8 mb-4">
            Angaben gem&auml;&szlig; &sect; 5 DDG
          </h2>
          <ul className="list-none pl-0 space-y-1">
            <li>b25 Ventures UG (haftungsbeschr&auml;nkt)</li>
            <li>Kaltenberg 3</li>
            <li>63776 M&ouml;mbris</li>
            <li>Germany</li>
          </ul>

          <p className="mt-4">
            <strong>Gesch&auml;ftsf&uuml;hrer:</strong> Andreas Wissel
          </p>
          <p>
            <strong>Handelsregister:</strong> [HRB_NUMBER], Amtsgericht
            Aschaffenburg
          </p>
          <p>
            <strong>E-Mail:</strong>{" "}
            <a
              href="mailto:hello@andreaswissel.com"
              className="underline hover:text-foreground"
            >
              hello@andreaswissel.com
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            Kleinunternehmer gem&auml;&szlig; &sect; 19 UStG &mdash; es wird
            keine Umsatzsteuer ausgewiesen. Eine USt-IdNr. ist nicht vorhanden.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            Verantwortlich f&uuml;r den Inhalt nach &sect; 18 Abs. 2 MStV
          </h2>
          <ul className="list-none pl-0 space-y-1">
            <li>Andreas Wissel</li>
            <li>Kaltenberg 3</li>
            <li>63776 M&ouml;mbris</li>
            <li>Germany</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            EU-Streitschlichtung
          </h2>
          <p>
            Die Europ&auml;ische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p>
            Wir sind nicht bereit oder verpflichtet, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
            teilzunehmen.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            Haftungsausschluss
          </h2>

          <h3 className="text-lg font-medium mt-6 mb-3">Haftung f&uuml;r Inhalte</h3>
          <p>
            Als Diensteanbieter sind wir gem&auml;&szlig; &sect; 7 Abs. 1 DDG
            f&uuml;r eigene Inhalte auf diesen Seiten nach den allgemeinen
            Gesetzen verantwortlich. Nach &sect;&sect; 8 bis 10 DDG sind wir als
            Diensteanbieter jedoch nicht verpflichtet, &uuml;bermittelte oder
            gespeicherte fremde Informationen zu &uuml;berwachen oder nach
            Umst&auml;nden zu forschen, die auf eine rechtswidrige
            T&auml;tigkeit hinweisen. Verpflichtungen zur Entfernung oder
            Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen
            bleiben hiervon unber&uuml;hrt. Eine diesbez&uuml;gliche Haftung
            ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
            Rechtsverletzung m&ouml;glich. Bei Bekanntwerden von entsprechenden
            Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">Haftung f&uuml;r Links</h3>
          <p>
            Unser Angebot enth&auml;lt Links zu externen Websites Dritter, auf
            deren Inhalte wir keinen Einfluss haben. Deshalb k&ouml;nnen wir
            f&uuml;r diese fremden Inhalte auch keine Gew&auml;hr
            &uuml;bernehmen. F&uuml;r die Inhalte der verlinkten Seiten ist
            stets der jeweilige Anbieter oder Betreiber der Seiten
            verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
            Verlinkung auf m&ouml;gliche Rechtsverst&ouml;&szlig;e
            &uuml;berpr&uuml;ft. Rechtswidrige Inhalte waren zum Zeitpunkt der
            Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der
            verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer
            Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
            Rechtsverletzungen werden wir derartige Links umgehend entfernen.
          </p>
        </div>
      </main>
    </div>
  );
}
