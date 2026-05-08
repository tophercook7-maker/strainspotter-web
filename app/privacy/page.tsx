import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How StrainSpotter collects, uses, and protects information about you and your photos.",
};

const updated = "May 6, 2026";

export default function PrivacyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0f0a",
        color: "#fff",
        padding: "32px 20px 80px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          ← Home
        </Link>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            margin: "20px 0 6px",
            letterSpacing: -0.5,
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>
          Last updated: {updated}
        </p>

        <Section heading="The short version">
          <p>
            StrainSpotter is built to be useful without being creepy. We
            collect the minimum information needed to provide AI scanning,
            Grow Doctor diagnostics, and your personal grow history. We do
            not sell your data, run third-party advertising, or share your
            photos beyond what is required to generate your scan results.
          </p>
        </Section>

        <Section heading="What we collect">
          <Bullet label="Account information">
            Your email address (and a password hash you create on Stripe or
            Supabase, never visible to us). If you sign in with Apple or
            Google, only the email and a unique account identifier they
            return to us.
          </Bullet>
          <Bullet label="Subscription information">
            Stripe handles your payment information. We never see your card
            number. We store your Stripe customer ID and the membership
            tier ("Member" or "Pro") and renewal status.
          </Bullet>
          <Bullet label="Photos you upload for scanning">
            When you tap Scan or Diagnose, the photo is sent to our server
            and forwarded to OpenAI&rsquo;s GPT-4o Vision API to generate a
            result. We do not retain the photo after the request completes
            unless you explicitly choose to save the scan to your history
            or favorites.
          </Bullet>
          <Bullet label="Locally-stored garden data">
            Your grow logs, plants, sessions, favorites, and journal
            entries are stored on your device&rsquo;s localStorage. They
            stay on your device unless you sign in and opt in to cloud
            sync (currently in development).
          </Bullet>
          <Bullet label="Age verification">
            On first launch we ask you to enter a date of birth to confirm
            you are 18 or older. We store only a flag confirming
            verification and the timestamp, on your device. We do not
            store or transmit your date of birth.
          </Bullet>
          <Bullet label="Diagnostic / crash data">
            Vercel collects standard server logs (IP address, request
            path, response status). We may use this to debug issues. We
            do not run third-party analytics (no Google Analytics, no ad
            tech, no fingerprinting).
          </Bullet>
        </Section>

        <Section heading="What we do NOT collect">
          <ul style={ulStyle}>
            <li>We do not sell your data. Ever.</li>
            <li>We do not run third-party advertising or behavioral tracking.</li>
            <li>We do not collect your contacts, calendar, photos library beyond what you explicitly upload, location (unless you tap to use the Dispensaries finder), or microphone.</li>
            <li>We do not share your scans with other users unless you opt in to community photo contribution.</li>
            <li>
              We do not provide medical advice or claim that cannabis treats
              any condition. Nothing in this app constitutes medical advice.
            </li>
          </ul>
        </Section>

        <Section heading="How we use AI">
          <p>
            StrainSpotter sends your photo to OpenAI&rsquo;s GPT-4o Vision
            API to produce strain analysis or plant-problem diagnosis. Per
            OpenAI&rsquo;s data-use policies for API customers, those
            requests are not used to train OpenAI&rsquo;s models. We store
            no copy of the image on our servers beyond the request
            lifetime.
          </p>
          <p>
            If you save a scan to your history or favorites, the saved scan
            includes the original image plus the AI result, stored against
            your account so you can return to it.
          </p>
        </Section>

        <Section heading="Data retention">
          <p>
            Account and subscription data: kept while you have an active
            account. If you delete your account, we erase your records
            within 30 days, with the exception of any payment records we
            are legally required to retain for tax purposes.
          </p>
          <p>
            Saved scans and grow data: kept until you delete them. You can
            delete an individual record from inside the app or wipe
            everything via Settings → Privacy &amp; Age.
          </p>
          <p>
            Server logs: kept for up to 90 days, then automatically purged.
          </p>
        </Section>

        <Section heading="Your rights">
          <p>
            You can request a copy of your data, ask us to correct
            inaccurate data, or ask us to delete your account at any time
            by emailing the address below. If you are in California
            (CCPA), the EU/UK (GDPR), or another jurisdiction with
            applicable privacy law, you have the rights granted under
            those laws and we will honor them.
          </p>
        </Section>

        <Section heading="Children">
          <p>
            StrainSpotter is for adults 18 and older. We do not knowingly
            collect information from anyone under 18. If we learn that we
            have, we will delete it.
          </p>
        </Section>

        <Section heading="Changes to this policy">
          <p>
            If we make material changes to how we handle your data, we
            will update this page and, where required, notify you in the
            app or by email.
          </p>
        </Section>

        <Section heading="Contact">
          <p>
            For privacy questions or data requests, email{" "}
            <a
              href="mailto:privacy@strainspotter.app"
              style={{ color: "#81C784" }}
            >
              privacy@strainspotter.app
            </a>
            .
          </p>
        </Section>

        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 32 }}>
          See also the{" "}
          <Link href="/terms" style={{ color: "rgba(129,199,132,0.7)" }}>
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          margin: "0 0 10px",
          color: "#fff",
        }}
      >
        {heading}
      </h2>
      <div
        style={{
          color: "rgba(255,255,255,0.78)",
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Bullet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <strong style={{ color: "#fff" }}>{label}.</strong>{" "}
      <span>{children}</span>
    </div>
  );
}

const ulStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 22,
  lineHeight: 1.7,
};
