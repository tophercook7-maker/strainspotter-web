# App Store Listing Copy — StrainSpotter

Last updated: May 6, 2026

This document is the working source of truth for what we submit to the
Apple App Store. Tweak as launch approaches; the field-by-field structure
matches App Store Connect.

---

## App name (display)

**StrainSpotter**

(30 character limit — fits with 14 to spare)

## Subtitle

**Scan, Analyze, Grow Cannabis**

(30 character limit — exactly 30)

Alternates if the above feels redundant with the name:

- "Honest Strain ID & Grow Coach" (29)
- "Cannabis Companion App" (22)
- "AI Strain Scanner & Grow Doctor" (32 — over)

## Promotional text

(170 char limit. Editable any time without re-review.)

> Now with Grow Doctor — diagnose plant problems from a photo. Get ranked likely causes, severity, and concrete next steps from cultivation expertise built in.

(159 chars)

## Description

(4000 char limit. Below is ~2700 — leaves room to tune.)

> StrainSpotter is the cannabis companion built for honesty.
>
> Most strain-ID apps lie about their confidence. We don't. When you scan a labeled jar or seed packet, our AI reads the label and confirms the strain. When you scan unlabeled flower, we tell you exactly what we see — bud structure, trichome maturity, likely terpene family — and give you a ranked list of plausible candidates with calibrated confidence, instead of pretending we're sure when we're not.
>
> ━ WHAT YOU GET ━
>
> SCAN & ANALYZE
> • Snap a photo of a dispensary jar, seed packet, or bud and get an honest strain analysis
> • Catch mislabeled product — tell us what the seller called it and we'll check whether the visual evidence supports the claim
> • OCR-first design: when there's a label, we use it. When there isn't, we don't fake it
> • Detects when an image isn't cannabis and tells you instead of guessing
>
> GROW DOCTOR
> • A cultivation companion across the entire 9-stage lifecycle — from picking the right seeds to dialing in the cure
> • 40+ in-depth tips covering sourcing, germination, seedling, vegetative, flowering, drying, curing, and post-harvest
> • Diagnose a plant problem from a photo: yellow leaves, pests, weird buds — get ranked likely causes with severity and concrete same-day actions
> • Track every grow; organize plants into Grow Groups (tents, rooms, runs)
>
> STRAIN LIBRARY
> • 314 cultivars with type, lineage, terpene profile, effect family, and visual morphology
> • Filter by what you actually want — discover strains by effect or terpene
> • Save favorites
>
> SESSION DIARY
> • Log how each session went: strain, method, dose, mood before and after, setting, rating
> • Build your own personal map of what works for you
>
> NEARBY
> • Find cannabis dispensaries within your selected radius
> • Browse vetted seed vendors with proven track records
>
> ━ HONEST ABOUT WHAT AI CAN AND CAN'T DO ━
>
> Specific strain identification from an unlabeled bud photo is genuinely hard — phenotype variation within a strain often exceeds the visual variation between strains. We tell you that up front, and our app is designed around being useful even when certainty isn't possible.
>
> ━ COMING SOON ━
>
> StrainSpotter is built to grow into the broader cannabis community: networking between growers, dispensaries, and consumers (no commerce inside the app — just connection and conversation). When you're ready to share what you've learned and what you've grown, the platform will be ready for you.
>
> ━ HONEST ABOUT WHAT THIS APP IS NOT ━
>
> StrainSpotter is not a marketplace. It does not facilitate the sale of cannabis or any controlled substance. It is not medical advice. Always follow the law where you live.

## Keywords

(100 char limit, comma-separated)

```
strain,cannabis,marijuana,weed,grow,scanner,plant,doctor,terpene,seed,leaf,grower,dispensary,bud
```

(99 chars)

## Category

- **Primary:** Lifestyle
- **Secondary:** Education

(Education makes the cultivation/Grow Doctor angle clear to reviewers and avoids the "is this an unlicensed dispensary?" question.)

## Age rating

Per Apple's rating questionnaire:

- **Frequent/Intense Realistic Violence** — None
- **Cartoon or Fantasy Violence** — None
- **Sexual Content or Nudity** — None
- **Profanity or Crude Humor** — None
- **Alcohol, Tobacco, or Drug Use or References** — **Frequent/Intense**
- **Mature/Suggestive Themes** — None
- **Horror/Fear Themes** — None
- **Medical/Treatment Information** — None
- **Gambling and Contests** — None
- **Unrestricted Web Access** — No

Resulting rating: **17+**

## What's New (release notes)

(4000 char limit, per release. Below is the v1.0 launch version.)

> Welcome to StrainSpotter v1.0!
>
> • Scan & Analyze: AI cannabis identification with calibrated confidence
> • Grow Doctor: full-lifecycle grow companion + photo-based plant diagnostics
> • Strain library with 314 cultivars
> • Seller's-claim verification
> • 18+ age verification

## App Store Review notes

(Hidden field for Apple reviewers, max ~6000 chars.)

> StrainSpotter is an educational and informational cannabis app. It does NOT facilitate the sale of cannabis or any controlled substance.
>
> What it does:
> 1. AI-assisted analysis of cannabis photos for educational and identification purposes
> 2. A grow-tracking and educational tool for legal home cultivation in jurisdictions where that is allowed
> 3. A strain database with horticultural information (lineage, terpenes, growing characteristics)
>
> What it does NOT do:
> - No purchases or transactions related to cannabis
> - No links to dispensaries that facilitate purchase
> - No medical advice; we explicitly disclaim medical claims throughout
> - No content directed at minors; 18+ age gate on first launch and re-accessible from Settings → Privacy & Age
>
> Test account (if needed):
>   email: [TODO]
>   password: [TODO]
>
> Notes for the reviewer:
> - The "Diagnose a Plant Problem" feature is for plant health (e.g., nutrient deficiency, pests). It does not provide medical advice for humans.
> - The "Partake" stage in Grow Doctor is educational content about the lifecycle of a cured plant — what experienced growers do with the product they've grown. There are no purchase prompts or commerce flows.
> - All AI analysis is performed via a server-side OpenAI API call. No user image is retained on the server beyond the request lifetime.

## Support / Marketing URLs

- **Support URL:** https://strainspotter.app/support
- **Marketing URL:** https://strainspotter.app
- **Privacy Policy URL:** https://strainspotter.app/privacy
- **Terms of Service URL:** https://strainspotter.app/terms

(All four pages must exist and be public before submission. The /privacy and /terms paths are already exempt from the AgeGate routing wrapper.)

## Screenshots required

iOS App Store needs at minimum:
- iPhone 6.7" (1290 × 2796) — at least 3 screenshots
- iPhone 6.5" (1242 × 2688) — at least 3 screenshots
- iPad 12.9" (2048 × 2732) — only if iPad-supported

Recommended shots, in order:
1. **Hero scan result** with seller's-claim "consistent" verdict
2. **OCR card + multi-candidate result** showing honest confidence
3. **Grow Doctor stage tips** (e.g. flowering)
4. **Diagnostic dialog result** (severity + ranked diagnoses + actions)
5. **Strain library / discovery**
6. **Age gate** is OK to omit; lead with content
