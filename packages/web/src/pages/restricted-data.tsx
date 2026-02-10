import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function RestrictedDataPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-lg font-semibold">Restricted Data Notice</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-xl border bg-card p-6 md:p-8 space-y-5">
          <p className="text-sm text-muted-foreground">
            Do not upload sensitive personal data unless your workspace is explicitly configured for it.
          </p>

          <section>
            <h2 className="font-semibold mb-2">Examples of restricted data</h2>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Health or biometric data</li>
              <li>Government IDs (passport, SSN, tax IDs)</li>
              <li>Payment card or bank account details</li>
              <li>Passwords, private keys, or authentication tokens</li>
              <li>Children&apos;s personal data</li>
              <li>Attorney-client privileged or confidential legal content</li>
              <li>Trade secrets or confidential customer records without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold mb-2">Your responsibility</h2>
            <p className="text-sm text-muted-foreground">
              By submitting content, you confirm you are authorized to process it and have all required rights,
              notices, and consents.
            </p>
          </section>

          <section>
            <h2 className="font-semibold mb-2">Uploaded by mistake?</h2>
            <p className="text-sm text-muted-foreground">
              Contact <a href="mailto:privacy@product-os.ai" className="underline hover:text-foreground">privacy@product-os.ai</a> and include your workspace ID so we can help remove restricted content quickly.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
