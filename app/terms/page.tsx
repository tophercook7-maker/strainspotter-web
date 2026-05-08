import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of StrainSpotter, including subscription, content rules, and disclaimers.",
};

const updated = "May 6, 2026";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0 }}>
          Last updated: {updated}
        </p>

        <Section heading="Welcome">
          <p>
            These Terms of Service govern your use of StrainSpotter (the
            &ldquo;Service&rdquo;). By creating an account or using the
            Service, you agree to these terms. If you don&rsquo;t agree,
            don&rsquo;t use the Service.
          </p>
        </Section>

        <Section heading="Eligibility">
          <p>
            You must be at least 18 years old to use the Service. By using
            it you represent that you meet this requirement and that your
            use of cannabis-related information is legal in your
            jurisdiction.
          </p>
        </Section>

        <Section heading="What StrainSpotter is and is not">
          <p>
            <strong>What it is:</strong> an educational and informational
            tool for adult users to identify cannabis strains from photos,
            track personal cultivation, log consumption sessions, and
            browse a horticultural strain database.
          </p>
          <p>
            <strong>What it is not:</strong>
          </p>
          <ul style={ulStyle}>
            <li>Not a medical service. Nothing in the Service is medical advice. Do not use it to diagnose, treat, prevent, or cure any condition.</li>
            <li>Not a marketplace. The Service does not facilitate the sale, purchase, transfer, or delivery of cannabis or any controlled substance. Dispensary listings are informational only.</li>
            <li>Not a substitute for professional advice. Cultivation guidance is general; for serious plant disease, financial, or legal questions, consult an appropriate professional.</li>
          </ul>
        </Section>

        <Section heading="Subscriptions and payment">
          <p>
            Most StrainSpotter features are available to active
            subscribers. We offer two paid tiers (Member and Pro), billed
            monthly. Payment is processed by Stripe; by subscribing you
            also agree to Stripe&rsquo;s terms.
          </p>
          <p>
            You can cancel any time from Settings → Manage subscription.
            Cancellation stops future renewals; access continues through
            the end of the current billing period. We do not provide
            partial-month refunds except where required by law.
          </p>
          <p>
            We may change pricing with at least 30 days&rsquo; advance
            notice. Continued use after the change date constitutes
            acceptance.
          </p>
        </Section>

        <Section heading="Acceptable use">
          <p>You agree not to:</p>
          <ul style={ulStyle}>
            <li>Use the Service to identify, distribute, or facilitate sale of any controlled substance in violation of applicable law.</li>
            <li>Submit photos that you don&rsquo;t have the right to upload (e.g., copyrighted images you do not own or have not licensed).</li>
            <li>Submit photos depicting minors, sexual content, or violence.</li>
            <li>Reverse-engineer, scrape, or attempt to bypass the subscription gate.</li>
            <li>Use the Service to provide medical, legal, or financial advice to others.</li>
            <li>Attempt to harm the Service, other users, or our infrastructure (rate limit abuse, prompt injection, malware, etc.).</li>
          </ul>
          <p>
            We may suspend or terminate accounts that violate these rules.
          </p>
        </Section>

        <Section heading="Your content">
          <p>
            You retain ownership of any photos, notes, or other content
            you submit. By submitting content, you grant us a limited,
            worldwide, royalty-free license to process it for the
            purposes of providing the Service to you (sending photos to
            our AI provider for analysis, displaying your scan history
            back to you, etc.). We do not claim ownership of your content
            and we do not use it to train AI models.
          </p>
          <p>
            If you opt in to community photo contribution, you grant an
            additional license to display the contributed image on
            relevant strain or terpene reference pages within the
            Service. You can revoke that consent at any time.
          </p>
        </Section>

        <Section heading="AI accuracy and limitations">
          <p>
            Strain identification from a photo is genuinely difficult, and
            our AI is honest about its uncertainty. Results, candidates,
            and confidence levels are estimates, not guarantees. Use
            multiple data points (lab results, dispensary documentation,
            personal experience) before making any consequential
            decision based on a scan.
          </p>
          <p>
            Grow Doctor diagnostics provide general cultivation guidance
            based on the photo and context you provide. They are not a
            substitute for hands-on inspection by an experienced grower.
          </p>
        </Section>

        <Section heading="Intellectual property">
          <p>
            The Service, including its software, design, copy, and
            curated strain database, is protected by copyright, trademark,
            and other laws. You may not copy, redistribute, or build
            derivative products from the Service without our written
            permission.
          </p>
        </Section>

        <Section heading="Disclaimers">
          <p>
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
            AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
            IMPLIED, TO THE FULLEST EXTENT PERMITTED BY LAW. We do not
            warrant that the Service will be error-free, that AI results
            will be accurate, or that the Service will be available at
            all times.
          </p>
        </Section>

        <Section heading="Limitation of liability">
          <p>
            TO THE FULLEST EXTENT PERMITTED BY LAW, OUR LIABILITY FOR ANY
            CLAIM ARISING FROM YOUR USE OF THE SERVICE IS LIMITED TO THE
            AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE EVENT GIVING
            RISE TO THE CLAIM. WE ARE NOT LIABLE FOR INDIRECT,
            INCIDENTAL, OR CONSEQUENTIAL DAMAGES (LOST PROFITS, LOST
            CROPS, ETC.).
          </p>
        </Section>

        <Section heading="Indemnification">
          <p>
            You agree to indemnify us against claims arising from your
            misuse of the Service, your violation of these Terms, or your
            violation of any law or third-party right.
          </p>
        </Section>

        <Section heading="Governing law and disputes">
          <p>
            These Terms are governed by the laws of the State of
            Arkansas, without regard to conflict-of-laws principles. Any
            dispute will be brought in the state or federal courts
            located in Garland County, Arkansas, unless otherwise
            required by applicable consumer-protection law.
          </p>
        </Section>

        <Section heading="Changes to these Terms">
          <p>
            We may update these Terms from time to time. If a change is
            material, we will give at least 14 days&rsquo; notice in the
            app or by email. Continued use after the effective date is
            acceptance of the change.
          </p>
        </Section>

        <Section heading="Contact">
          <p>
            Questions about these Terms? Email{" "}
            <a
              href="mailto:legal@strainspotter.app"
              style={{ color: "#81C784" }}
            >
              legal@strainspotter.app
            </a>
            .
          </p>
        </Section>

        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 32 }}>
          See also the{" "}
          <Link href="/privacy" style={{ color: "rgba(129,199,132,0.7)" }}>
            Privacy Policy
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

const ulStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 22,
  lineHeight: 1.7,
};
