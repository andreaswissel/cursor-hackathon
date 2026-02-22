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
          <h1 className="text-lg font-semibold">Legal Notice</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h2 className="text-xl font-semibold mt-8 mb-4">
            Information according to &sect; 5 TMG
          </h2>
          <ul className="list-none pl-0 space-y-1">
            <li>blankk UG (haftungsbeschr&auml;nkt)</li>
            <li>Sandgasse 33</li>
            <li>63739 Aschaffenburg</li>
          </ul>

          <p className="mt-4">
            <strong>Commercial register:</strong> HRB 16334
          </p>
          <p>
            <strong>Represented by:</strong> Andreas Wissel
          </p>
          <p>
            <strong>Contact us</strong>
            <br />
            <strong>E-Mail:</strong>{" "}
            <a
              href="mailto:hello@andreaswissel.com"
              className="underline hover:text-foreground"
            >
              hello@andreaswissel.com
            </a>
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            Note in accordance with the Online Dispute Resolution Regulation
          </h2>
          <p>
            Under applicable law, we are obliged to inform consumers of the
            existence of the European online dispute resolution platform, which
            can be used to resolve disputes without having to go to court. The
            European Commission is responsible for setting up the platform. The
            European online dispute resolution platform can be found here:{" "}
            <a
              href="http://ec.europa.eu/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              http://ec.europa.eu/odr
            </a>
            . Our email is:{" "}
            <a
              href="mailto:hello@andreaswissel.com"
              className="underline hover:text-foreground"
            >
              hello@andreaswissel.com
            </a>
            .
          </p>
          <p>
            However, we would like to point out that we are not prepared to
            participate in the dispute resolution procedure within the framework
            of the European online dispute resolution platform. Please use our
            email and telephone number above to contact us.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4">
            Disclaimer - legal information
          </h2>

          <h3 className="text-lg font-medium mt-6 mb-3">
            &sect; 1 Warning regarding content
          </h3>
          <p>
            The free and freely accessible content of this website has been
            created with the greatest possible care. However, the provider of
            this website assumes no liability for the accuracy and timeliness
            of the free and freely accessible journalistic guides and news
            provided. Contributions identified by name reflect the opinion of
            the respective author and not always the opinion of the provider.
            No contractual relationship is established between the user and the
            provider simply by accessing the free and freely accessible content;
            in this respect, the provider has no intention to be legally bound.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            &sect; 2 External links
          </h3>
          <p>
            This website contains links to third-party websites (&apos;external
            links&apos;). These websites are subject to the liability of the
            respective operators. When the external links were first created,
            the provider checked the third-party content for any legal
            violations. No legal violations were apparent at that time. The
            provider has no influence whatsoever on the current and future
            design and content of the linked pages. The inclusion of external
            links does not mean that the provider adopts the content behind the
            reference or link as its own. It is not reasonable for the provider
            to constantly monitor external links without concrete evidence of
            legal violations. However, such external links will be deleted
            immediately if we become aware of any legal violations.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            &sect; 3 Copyright and ancillary copyrights
          </h3>
          <p>
            The content published on this website is subject to German
            copyright and ancillary copyright law. Any use not permitted by
            German copyright and ancillary copyright law requires the prior
            written consent of the provider or respective rights holder. This
            applies in particular to the duplication, editing, translation,
            storage, processing or reproduction of content in databases or
            other electronic media and systems. Third-party content and rights
            are identified as such. The unauthorized reproduction or
            distribution of individual contents or complete pages is not
            permitted and is punishable by law. Only the production of copies
            and downloads for personal, private and non-commercial use is
            permitted.
          </p>
          <p>
            The presentation of this website in external frames is only
            permitted with written permission.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-3">
            &sect; 4 Special terms of use
          </h3>
          <p>
            If special conditions for individual uses of this website deviate
            from the aforementioned paragraphs, this will be expressly
            indicated at the appropriate point. In this case, the special terms
            of use apply in each individual case.
          </p>
        </div>
      </main>
    </div>
  );
}
