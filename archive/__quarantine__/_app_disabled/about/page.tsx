"use client";

import Link from "next/link";

export default function AboutPage() {
  // Check if desktop test build
  const isDesktop = typeof window !== 'undefined' && 
    (window as any).__TAURI__ !== undefined;
  const isTestBuild = process.env.NEXT_PUBLIC_DESKTOP_TEST_BUILD === 'true';
  return (
    <div className="space-y-10 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Link href="/" className="text-emerald-400 mb-4 inline-block text-sm">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-semibold text-white mb-2">What StrainSpotter Is / Isn't</h1>
        <p className="text-white/80">
          Understanding our purpose, values, and boundaries.
        </p>
      </div>

      {/* What StrainSpotter Is */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">What StrainSpotter Is</h2>
        <ul className="space-y-3 text-white/90">
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 mt-1">✓</span>
            <div>
              <strong className="text-white">A cultivation tool</strong> — Track your grows, log observations, and learn from your data
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 mt-1">✓</span>
            <div>
              <strong className="text-white">A learning platform</strong> — Connect with growers, share experiences, and build knowledge together
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 mt-1">✓</span>
            <div>
              <strong className="text-white">A community space</strong> — Educational discussions moderated for safety and respect
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 mt-1">✓</span>
            <div>
              <strong className="text-white">A transparent platform</strong> — Clear rules, visible moderation, and honest communication
            </div>
          </li>
        </ul>
      </section>

      {/* What It Isn't */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">What It Isn't</h2>
        <ul className="space-y-3 text-white/90">
          <li className="flex items-start gap-3">
            <span className="text-red-400 mt-1">✗</span>
            <div>
              <strong className="text-white">A medical platform</strong> — We do not provide medical advice, diagnosis, or treatment recommendations
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red-400 mt-1">✗</span>
            <div>
              <strong className="text-white">A marketplace</strong> — We do not facilitate sales, trades, or transactions
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red-400 mt-1">✗</span>
            <div>
              <strong className="text-white">A social media platform</strong> — No likes, reactions, or engagement metrics. Focus is on knowledge, not popularity
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-red-400 mt-1">✗</span>
            <div>
              <strong className="text-white">A legal advisor</strong> — We do not provide legal advice. Always follow your local laws and regulations
            </div>
          </li>
        </ul>
      </section>

      {/* Advice & Safety */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">Advice & Safety</h2>
        <div className="space-y-3 text-white/90">
          <p>
            <strong className="text-white">Educational discussion only.</strong> All content in our Community is for educational purposes. 
            Growers share experiences and techniques, but these are not medical or legal recommendations.
          </p>
          <p>
            <strong className="text-white">No medical advice.</strong> StrainSpotter does not provide, endorse, or facilitate medical advice. 
            If you have health concerns, consult a licensed healthcare professional.
          </p>
          <p>
            <strong className="text-white">Follow local laws.</strong> Cannabis laws vary by location. It is your responsibility to know and 
            follow all applicable laws in your jurisdiction. StrainSpotter does not encourage or facilitate illegal activity.
          </p>
        </div>
      </section>

      {/* AI & Moderation Transparency */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">AI & Moderation Transparency</h2>
        <div className="space-y-3 text-white/90">
          <p>
            <strong className="text-white">AI in assist mode.</strong> Our AI moderation system operates in assist mode, meaning it may 
            show contextual warnings but does not automatically block content. All moderation decisions are reviewed by human moderators.
          </p>
          <p>
            <strong className="text-white">Transparent moderation.</strong> If content is flagged or hidden, we provide a clear explanation 
            and offer options to appeal or edit. We believe in transparency and giving users control over their content.
          </p>
          <p>
            <strong className="text-white">No hidden algorithms.</strong> We don't use engagement metrics, popularity scores, or hidden ranking 
            systems. Content is organized chronologically and by relevance, not by engagement.
          </p>
        </div>
      </section>

      {/* Core Values */}
      <section className="rounded-xl bg-white/10 backdrop-blur-lg p-6 border border-white/20">
        <h2 className="text-xl font-semibold text-white mb-4">Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-white font-medium">Trust</h3>
            <p className="text-sm text-white/80">
              We build trust through transparency, clear communication, and consistent moderation.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-medium">Education</h3>
            <p className="text-sm text-white/80">
              Knowledge sharing is our primary goal. We prioritize learning over engagement metrics.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-medium">Safety</h3>
            <p className="text-sm text-white/80">
              We maintain a safe environment through clear rules, active moderation, and user accountability.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-medium">Respect</h3>
            <p className="text-sm text-white/80">
              We foster respectful discussions where all growers, regardless of experience level, feel welcome.
            </p>
          </div>
        </div>
      </section>

              {/* Footer */}
              <div className="text-center text-white/60 text-sm pt-6">
                <p>Questions? Contact us through Community Support.</p>
                {isDesktop && isTestBuild && (
                  <p className="text-xs text-white/40 mt-2 font-mono">
                    StrainSpotter — Early Test Build
                  </p>
                )}
              </div>
            </div>
          );
        }
