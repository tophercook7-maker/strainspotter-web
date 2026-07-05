// Interactive landing page. Kept at /welcome so the existing scanner-first
// redirect at / stays intact; point app/page.tsx here to make it the homepage.

import StrainSpotterLanding from "@/components/StrainSpotterLanding";

export const metadata = {
  title: "StrainSpotter — Honest cannabis strain ID & grow doctor",
  description:
    "One scan, two honest answers. Point your camera at any bud, plant, or label and get a calibrated strain ID plus a plant-health check — never a fake confident guess.",
};

export default function WelcomePage() {
  return <StrainSpotterLanding />;
}
