"use client";

import { useState, useMemo } from "react";
import TopNav from "../_components/TopNav";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ButtonBase from "@mui/material/ButtonBase";
import SearchIcon from "@mui/icons-material/Search";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SpaIcon from "@mui/icons-material/Spa";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";

// ─── Types ───────────────────────────────────────────────────────────────────
type StrainType = "sativa" | "indica" | "hybrid";

interface Strain {
  id: string;
  name: string;
  type: StrainType;
  thc: string;
  effects: string[];
  terpenes: string[];
  flavor: string;
  description: string;
  parents?: string[];
}

// ─── Strain Database ─────────────────────────────────────────────────────────
const STRAINS: Strain[] = [
  // ── Foundational Landrace / Classic ──
  { id: "og-kush", name: "OG Kush", type: "hybrid", thc: "20–25%", effects: ["Euphoric", "Relaxed", "Happy"], terpenes: ["Myrcene", "Limonene", "Caryophyllene"], flavor: "Earthy, Pine, Woody", description: "The backbone of West Coast cannabis. OG Kush is a legendary hybrid with a complex earthy, pine aroma. It sparked countless elite crosses.", parents: [] },
  { id: "sour-diesel", name: "Sour Diesel", type: "sativa", thc: "19–25%", effects: ["Energetic", "Creative", "Uplifted"], terpenes: ["Caryophyllene", "Myrcene", "Limonene"], flavor: "Diesel, Pungent, Citrus", description: "One of the most recognizable sativas ever. Sour Diesel's unmistakable fuel-like aroma and fast-acting cerebral high made it a staple.", parents: [] },
  { id: "durban-poison", name: "Durban Poison", type: "sativa", thc: "15–25%", effects: ["Energetic", "Uplifted", "Creative"], terpenes: ["Terpinolene", "Myrcene", "Ocimene"], flavor: "Sweet, Earthy, Pine", description: "A pure South African sativa landrace known for its sweet smell and energetic high. One of the most important parent strains in modern genetics.", parents: [] },
  { id: "haze", name: "Haze", type: "sativa", thc: "17–21%", effects: ["Creative", "Energetic", "Uplifted"], terpenes: ["Terpinolene", "Myrcene", "Caryophyllene"], flavor: "Earthy, Spicy, Citrus", description: "The OG sativa from the 1960s. Haze set the standard for cerebral, creative highs and fathered dozens of legendary sativa-dominant crosses.", parents: [] },
  { id: "northern-lights", name: "Northern Lights", type: "indica", thc: "16–21%", effects: ["Relaxed", "Sleepy", "Happy"], terpenes: ["Myrcene", "Caryophyllene", "Pinene"], flavor: "Sweet, Earthy, Spicy", description: "One of the most famous indicas of all time. Northern Lights delivers a full-body stone with a sweet, earthy taste. A staple since the 1980s.", parents: [] },
  { id: "blueberry", name: "Blueberry", type: "indica", thc: "17–24%", effects: ["Relaxed", "Happy", "Euphoric"], terpenes: ["Myrcene", "Pinene", "Caryophyllene"], flavor: "Blueberry, Sweet, Berry", description: "DJ Short's masterpiece. This indica legend delivers a sweet blueberry flavor and a dreamy, full-body relaxation that's unmatched.", parents: [] },
  { id: "purple-urkle", name: "Purple Urkle", type: "indica", thc: "18–21%", effects: ["Relaxed", "Sleepy", "Hungry"], terpenes: ["Myrcene", "Caryophyllene", "Pinene"], flavor: "Grape, Berry, Sweet", description: "A California classic with deep purple hues and a sweet grape flavor. Known for heavy sedation — a true nighttime strain.", parents: [] },
  { id: "big-bud", name: "Big Bud", type: "indica", thc: "15–20%", effects: ["Relaxed", "Sleepy", "Happy"], terpenes: ["Myrcene", "Pinene", "Caryophyllene"], flavor: "Earthy, Sweet, Spicy", description: "Named for its massive yields. Big Bud is a mellow indica with a sweet, earthy profile. A breeder's dream for high-output grows.", parents: [] },
  { id: "white-widow", name: "White Widow", type: "hybrid", thc: "18–25%", effects: ["Creative", "Euphoric", "Energetic"], terpenes: ["Myrcene", "Caryophyllene", "Limonene"], flavor: "Earthy, Woody, Pungent", description: "Born in the Netherlands in the 90s, White Widow is a balanced hybrid coated in white trichomes. Known worldwide for its potent, buzzy high.", parents: [] },
  { id: "chem-sister", name: "Chem Sister", type: "hybrid", thc: "20–24%", effects: ["Euphoric", "Uplifted", "Creative"], terpenes: ["Caryophyllene", "Limonene", "Myrcene"], flavor: "Chemical, Diesel, Pungent", description: "Part of the legendary Chemdog family. Chem Sister carries that same sharp, chemical aroma with a strong, uplifting cerebral effect.", parents: [] },
  { id: "grape-ape", name: "Grape Ape", type: "indica", thc: "15–23%", effects: ["Relaxed", "Sleepy", "Happy"], terpenes: ["Myrcene", "Pinene", "Caryophyllene"], flavor: "Grape, Berry, Sweet", description: "Dense purple nugs with an unmistakable grape candy flavor. Grape Ape delivers heavy relaxation and is a go-to for pain relief.", parents: [] },
  { id: "grapefruit", name: "Grapefruit", type: "sativa", thc: "18–22%", effects: ["Energetic", "Uplifted", "Happy"], terpenes: ["Myrcene", "Caryophyllene", "Limonene"], flavor: "Citrus, Grapefruit, Sweet", description: "A bright, citrusy sativa with an unmistakable grapefruit flavor. Great for morning sessions and creative work.", parents: [] },

  // ── First-Generation Crosses ──
  { id: "girl-scout-cookies", name: "Girl Scout Cookies", type: "hybrid", thc: "25–28%", effects: ["Euphoric", "Happy", "Creative"], terpenes: ["Caryophyllene", "Limonene", "Humulene"], flavor: "Sweet, Earthy, Mint", description: "GSC changed the game. Born from OG Kush and Durban Poison, this Bay Area legend delivers a euphoric, creative high with sweet, minty flavor.", parents: ["og-kush", "durban-poison"] },
  { id: "blue-dream", name: "Blue Dream", type: "hybrid", thc: "21–28%", effects: ["Creative", "Euphoric", "Relaxed"], terpenes: ["Myrcene", "Caryophyllene", "Pinene"], flavor: "Blueberry, Sweet, Berry", description: "California's most popular strain for a reason. Blueberry x Haze creates a balanced, creative high that's perfect for any time of day.", parents: ["blueberry", "haze"] },
  { id: "granddaddy-purple", name: "Granddaddy Purple", type: "indica", thc: "17–23%", effects: ["Relaxed", "Sleepy", "Happy"], terpenes: ["Myrcene", "Caryophyllene", "Pinene"], flavor: "Grape, Berry, Sweet", description: "GDP is the king of purple strains. Big Bud's yields meet Purple Urkle's beautiful colors and sedating body high. A nighttime classic.", parents: ["purple-urkle", "big-bud"] },
  { id: "jack-herer", name: "Jack Herer", type: "sativa", thc: "18–23%", effects: ["Creative", "Energetic", "Focused"], terpenes: ["Terpinolene", "Caryophyllene", "Pinene"], flavor: "Pine, Earthy, Spicy", description: "Named after the cannabis activist. Jack Herer is a sativa-dominant hybrid with a clear-headed, creative high. A daytime essential.", parents: ["haze"] },
  { id: "sour-dubb", name: "Sour Dubb", type: "hybrid", thc: "21–26%", effects: ["Relaxed", "Euphoric", "Uplifted"], terpenes: ["Caryophyllene", "Myrcene", "Limonene"], flavor: "Diesel, Sour, Earthy", description: "A Sour Diesel offspring with that same fuel-forward aroma but heavier body effects. Key parent in the Gorilla Glue lineage.", parents: ["sour-diesel"] },
  { id: "cherry-pie", name: "Cherry Pie", type: "hybrid", thc: "16–24%", effects: ["Happy", "Euphoric", "Relaxed"], terpenes: ["Myrcene", "Caryophyllene", "Pinene"], flavor: "Cherry, Sweet, Berry", description: "Granddaddy Purple meets Durban Poison. Cherry Pie smells like fresh-baked dessert with a balanced, happy high.", parents: ["granddaddy-purple", "durban-poison"] },
  { id: "sunset-sherbet", name: "Sunset Sherbet", type: "hybrid", thc: "18–24%", effects: ["Relaxed", "Happy", "Euphoric"], terpenes: ["Caryophyllene", "Myrcene", "Humulene"], flavor: "Sweet, Citrus, Berry", description: "A GSC phenotype with fruity, dessert-like flavors. Sunset Sherbet delivers a full-body calm with mood-lifting euphoria.", parents: ["girl-scout-cookies"] },
  { id: "zkittlez", name: "Zkittlez", type: "indica", thc: "15–23%", effects: ["Relaxed", "Happy", "Sleepy"], terpenes: ["Caryophyllene", "Linalool", "Humulene"], flavor: "Tropical, Berry, Sweet", description: "Taste the rainbow. Zkittlez combines Grape Ape and Grapefruit into an indica with insane tropical candy flavor. Multiple cup winner.", parents: ["grape-ape", "grapefruit"] },

  // ── Elite Modern Crosses ──
  { id: "gorilla-glue", name: "Gorilla Glue #4", type: "hybrid", thc: "25–30%", effects: ["Relaxed", "Euphoric", "Happy"], terpenes: ["Caryophyllene", "Myrcene", "Limonene"], flavor: "Pine, Earthy, Chemical", description: "GG#4 is a beast. Sour Dubb x Chem Sister created one of the strongest strains on the market. Expect sticky, resin-coated buds and a heavy, euphoric couch-lock.", parents: ["sour-dubb", "chem-sister"] },
  { id: "gelato", name: "Gelato", type: "hybrid", thc: "20–25%", effects: ["Relaxed", "Euphoric", "Happy"], terpenes: ["Limonene", "Caryophyllene", "Humulene"], flavor: "Sweet, Citrus, Creamy", description: "Cookies genetics at their finest. GSC x Sunset Sherbet produces a smooth, dessert-flavored smoke with a balanced, blissful high.", parents: ["girl-scout-cookies", "sunset-sherbet"] },
  { id: "wedding-cake", name: "Wedding Cake", type: "hybrid", thc: "25–27%", effects: ["Relaxed", "Euphoric", "Happy"], terpenes: ["Limonene", "Caryophyllene", "Myrcene"], flavor: "Vanilla, Sweet, Earthy", description: "Rich, tangy with vanilla undertones. Wedding Cake is a potent hybrid born from GSC and Cherry Pie. Dense buds with heavy trichome coverage.", parents: ["girl-scout-cookies", "cherry-pie"] },
  { id: "runtz", name: "Runtz", type: "hybrid", thc: "24–29%", effects: ["Euphoric", "Happy", "Relaxed"], terpenes: ["Caryophyllene", "Limonene", "Linalool"], flavor: "Tropical, Candy, Sweet", description: "Gelato x Zkittlez created the strain of the decade. Runtz delivers candy-sweet flavor, beautiful bag appeal, and a perfectly balanced high.", parents: ["gelato", "zkittlez"] },
];

// ─── Colors & Helpers ────────────────────────────────────────────────────────
const TYPE_COLORS: Record<StrainType, { bg: string; border: string; text: string; gradient: string }> = {
  sativa: { bg: "rgba(255,213,79,0.12)", border: "#FFD54F", text: "#FFD54F", gradient: "linear-gradient(135deg, rgba(255,213,79,0.15), rgba(255,179,0,0.05))" },
  indica: { bg: "rgba(149,117,205,0.12)", border: "#9575CD", text: "#9575CD", gradient: "linear-gradient(135deg, rgba(149,117,205,0.15), rgba(106,27,154,0.05))" },
  hybrid: { bg: "rgba(102,187,106,0.12)", border: "#66BB6A", text: "#66BB6A", gradient: "linear-gradient(135deg, rgba(102,187,106,0.15), rgba(46,125,50,0.05))" },
};

const EFFECT_ICONS: Record<string, string> = {
  Euphoric: "✨", Relaxed: "😌", Happy: "😊", Creative: "🎨", Energetic: "⚡",
  Uplifted: "🚀", Sleepy: "😴", Hungry: "🍕", Focused: "🎯",
};

function glassCard(extra: Record<string, any> = {}) {
  return {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    ...extra,
  };
}

// ─── Strain Card Component ───────────────────────────────────────────────────
function StrainCard({ strain, onSelect, compact }: { strain: Strain; onSelect: (s: Strain) => void; compact?: boolean }) {
  const c = TYPE_COLORS[strain.type];
  return (
    <ButtonBase
      onClick={() => onSelect(strain)}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        borderRadius: "14px",
        background: c.gradient,
        border: `1px solid ${c.border}22`,
        p: compact ? 1.5 : 2,
        transition: "all 0.2s",
        "&:hover": { border: `1px solid ${c.border}55`, transform: "translateY(-2px)" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
            borderRadius: compact ? 1.5 : 2,
            background: `${c.border}18`,
            border: `1px solid ${c.border}33`,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <SpaIcon sx={{ fontSize: compact ? 18 : 22, color: c.text }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              color: "white",
              fontWeight: 700,
              fontSize: compact ? 13 : 15,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {strain.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "capitalize",
                color: c.text,
              }}
            >
              {strain.type}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>•</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
              THC {strain.thc}
            </Typography>
          </Box>
        </Box>
        {!compact && (
          <Box sx={{ display: "flex", gap: 0.25 }}>
            {strain.effects.slice(0, 3).map((e) => (
              <Box key={e} title={e} sx={{ fontSize: 14 }}>{EFFECT_ICONS[e] || "✨"}</Box>
            ))}
          </Box>
        )}
      </Box>
      {!compact && (
        <Typography
          sx={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 12,
            mt: 1,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {strain.description}
        </Typography>
      )}
    </ButtonBase>
  );
}

// ─── Lineage Tree Component ──────────────────────────────────────────────────
function LineageTree({ strain, onSelect }: { strain: Strain; onSelect: (s: Strain) => void }) {
  const parents = (strain.parents || [])
    .map((pid) => STRAINS.find((s) => s.id === pid))
    .filter(Boolean) as Strain[];

  const children = STRAINS.filter((s) => s.parents?.includes(strain.id));

  const grandparents = parents.flatMap((p) =>
    (p.parents || []).map((gpid) => ({ parent: p, grandparent: STRAINS.find((s) => s.id === gpid) }))
  ).filter((gp) => gp.grandparent) as { parent: Strain; grandparent: Strain }[];

  const grandchildren = children.flatMap((c) =>
    STRAINS.filter((s) => s.parents?.includes(c.id)).map((gc) => ({ child: c, grandchild: gc }))
  );

  if (parents.length === 0 && children.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <AccountTreeIcon sx={{ fontSize: 16, color: "#66BB6A" }} />
        <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          Family Tree
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {/* Grandparents */}
        {grandparents.length > 0 && (
          <>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              {[...new Map(grandparents.map((gp) => [gp.grandparent!.id, gp.grandparent!])).values()].map((gp) => (
                <Box key={gp.id} sx={{ flex: "1 1 140px", maxWidth: 200 }}>
                  <StrainCard strain={gp} onSelect={onSelect} compact />
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 0.5 }}>
              <Box sx={{ width: 1, height: 12, background: "rgba(255,255,255,0.15)" }} />
              <ArrowDownwardIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.25)", my: -0.25 }} />
            </Box>
          </>
        )}

        {/* Parents */}
        {parents.length > 0 && (
          <>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              {parents.map((p) => (
                <Box key={p.id} sx={{ flex: "1 1 140px", maxWidth: 220 }}>
                  <StrainCard strain={p} onSelect={onSelect} compact />
                </Box>
              ))}
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 0.5 }}>
              <Box sx={{ width: 1, height: 12, background: "rgba(255,255,255,0.15)" }} />
              <ArrowDownwardIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.25)", my: -0.25 }} />
            </Box>
          </>
        )}

        {/* Current Strain (highlighted) */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 320,
            p: 2,
            borderRadius: "14px",
            background: `${TYPE_COLORS[strain.type].border}15`,
            border: `2px solid ${TYPE_COLORS[strain.type].border}55`,
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: 22, mb: 0.25 }}>🌿</Typography>
          <Typography sx={{ color: "white", fontWeight: 800, fontSize: 16 }}>{strain.name}</Typography>
          <Typography sx={{ color: TYPE_COLORS[strain.type].text, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
            {strain.type} · THC {strain.thc}
          </Typography>
        </Box>

        {/* Children */}
        {children.length > 0 && (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 0.5 }}>
              <ArrowDownwardIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.25)", my: -0.25 }} />
              <Box sx={{ width: 1, height: 12, background: "rgba(255,255,255,0.15)" }} />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              {children.map((c) => (
                <Box key={c.id} sx={{ flex: "1 1 140px", maxWidth: 220 }}>
                  <StrainCard strain={c} onSelect={onSelect} compact />
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* Grandchildren */}
        {grandchildren.length > 0 && (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 0.5 }}>
              <ArrowDownwardIcon sx={{ fontSize: 14, color: "rgba(255,255,255,0.25)", my: -0.25 }} />
              <Box sx={{ width: 1, height: 12, background: "rgba(255,255,255,0.15)" }} />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
              {[...new Map(grandchildren.map((gc) => [gc.grandchild.id, gc.grandchild])).values()].map((gc) => (
                <Box key={gc.id} sx={{ flex: "1 1 140px", maxWidth: 200 }}>
                  <StrainCard strain={gc} onSelect={onSelect} compact />
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
function StrainDetail({ strain, onSelect, onClose }: { strain: Strain; onSelect: (s: Strain) => void; onClose: () => void }) {
  const c = TYPE_COLORS[strain.type];

  return (
    <Box
      onClick={onClose}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        pt: { xs: 2, sm: 4 },
        pb: 4,
        px: 2,
      }}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          width: "100%",
          maxWidth: 560,
          ...glassCard({
            background: "rgba(20,24,22,0.95)",
            border: `1px solid ${c.border}33`,
            p: 0,
            overflow: "hidden",
          }),
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            background: c.gradient,
            borderBottom: `1px solid ${c.border}22`,
            position: "relative",
          }}
        >
          <ButtonBase
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: 99,
              background: "rgba(0,0,0,0.3)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </ButtonBase>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                background: `${c.border}20`,
                border: `2px solid ${c.border}44`,
                display: "grid",
                placeItems: "center",
              }}
            >
              <SpaIcon sx={{ fontSize: 30, color: c.text }} />
            </Box>
            <Box>
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 22 }}>
                {strain.name}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.25 }}>
                <Box
                  sx={{
                    px: 1,
                    py: 0.15,
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "capitalize",
                    background: `${c.border}22`,
                    color: c.text,
                    border: `1px solid ${c.border}44`,
                  }}
                >
                  {strain.type}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <LocalFireDepartmentIcon sx={{ fontSize: 14, color: "#FF8A65" }} />
                  <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600 }}>
                    THC {strain.thc}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Description */}
          <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.7, mb: 2.5 }}>
            {strain.description}
          </Typography>

          {/* Effects */}
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, mb: 1 }}>
              Effects
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {strain.effects.map((e) => (
                <Box
                  key={e}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <span>{EFFECT_ICONS[e] || "✨"}</span> {e}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Terpenes */}
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, mb: 1 }}>
              Terpene Profile
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {strain.terpenes.map((t) => (
                <Box
                  key={t}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    background: `${c.border}12`,
                    color: c.text,
                    border: `1px solid ${c.border}22`,
                  }}
                >
                  {t}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Flavor */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, mb: 0.5 }}>
              Flavor
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              {strain.flavor}
            </Typography>
          </Box>

          {/* Lineage Tree */}
          <LineageTree strain={strain} onSelect={onSelect} />
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EcosystemPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | StrainType>("all");
  const [selected, setSelected] = useState<Strain | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "thc" | "type">("name");

  const filtered = useMemo(() => {
    let list = [...STRAINS];
    if (filter !== "all") list = list.filter((s) => s.type === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.effects.some((e) => e.toLowerCase().includes(q)) ||
          s.terpenes.some((t) => t.toLowerCase().includes(q)) ||
          s.flavor.toLowerCase().includes(q)
      );
    }
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "thc") list.sort((a, b) => parseInt(b.thc) - parseInt(a.thc));
    else if (sortBy === "type") list.sort((a, b) => a.type.localeCompare(b.type));
    return list;
  }, [filter, search, sortBy]);

  const stats = {
    total: STRAINS.length,
    sativa: STRAINS.filter((s) => s.type === "sativa").length,
    indica: STRAINS.filter((s) => s.type === "indica").length,
    hybrid: STRAINS.filter((s) => s.type === "hybrid").length,
    connections: STRAINS.reduce((n, s) => n + (s.parents?.length || 0), 0),
  };

  return (
    <>
      <TopNav title="Ecosystem" showBack />
      <main className="min-h-screen text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          {/* Hero */}
          <Box sx={{ ...glassCard({ p: 3, mb: 3 }) }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <AccountTreeIcon sx={{ fontSize: 28, color: "#66BB6A" }} />
              <Typography sx={{ color: "white", fontWeight: 800, fontSize: 24 }}>
                Strain Ecosystem
              </Typography>
            </Box>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.7 }}>
              Explore {stats.total} strains and their genetics. Tap any strain to see its full
              profile — effects, terpenes, flavor, and family tree showing parents, children,
              and grandchildren.
            </Typography>
          </Box>

          {/* Stats */}
          <Box sx={{ display: "flex", gap: 1.5, mb: 3, overflowX: "auto" }}>
            {[
              { label: "Strains", value: stats.total, color: "#66BB6A" },
              { label: "Sativa", value: stats.sativa, color: "#FFD54F" },
              { label: "Indica", value: stats.indica, color: "#9575CD" },
              { label: "Hybrid", value: stats.hybrid, color: "#66BB6A" },
              { label: "Genetic Links", value: stats.connections, color: "#64B5F6" },
            ].map((s) => (
              <Box key={s.label} sx={{ ...glassCard({ p: 1.5, flex: 1, textAlign: "center", minWidth: 70 }) }}>
                <Typography sx={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 600, mt: 0.25 }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Search + Filter */}
          <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <Box sx={{ position: "relative", flex: 1, minWidth: 180 }}>
              <SearchIcon sx={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", fontSize: 20 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search strains, effects, flavors..."
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 40px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </Box>
          </Box>

          {/* Type Filter Pills */}
          <Box sx={{ display: "flex", gap: 0.75, mb: 1.5, flexWrap: "wrap" }}>
            {(["all", "sativa", "indica", "hybrid"] as const).map((t) => {
              const active = filter === t;
              const tc = t === "all" ? null : TYPE_COLORS[t];
              return (
                <ButtonBase
                  key={t}
                  onClick={() => setFilter(t)}
                  sx={{
                    px: 1.5,
                    py: 0.6,
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    background: active ? (tc ? tc.bg : "rgba(255,255,255,0.12)") : "rgba(255,255,255,0.04)",
                    color: active ? (tc ? tc.text : "white") : "rgba(255,255,255,0.45)",
                    border: `1px solid ${active ? (tc ? tc.border + "44" : "rgba(255,255,255,0.25)") : "rgba(255,255,255,0.08)"}`,
                    transition: "all 0.2s",
                  }}
                >
                  {t === "all" ? `All (${stats.total})` : `${t} (${stats[t]})`}
                </ButtonBase>
              );
            })}

            <Box sx={{ flex: 1 }} />

            {/* Sort */}
            {(["name", "thc", "type"] as const).map((s) => (
              <ButtonBase
                key={s}
                onClick={() => setSortBy(s)}
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "capitalize",
                  background: sortBy === s ? "rgba(255,255,255,0.1)" : "transparent",
                  color: sortBy === s ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
                }}
              >
                {s === "thc" ? "THC" : s}
              </ButtonBase>
            ))}
          </Box>

          {/* Results count */}
          <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, mb: 1.5 }}>
            {filtered.length} strain{filtered.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </Typography>

          {/* Strain Grid */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {filtered.map((strain) => (
              <StrainCard key={strain.id} strain={strain} onSelect={setSelected} />
            ))}
          </Box>

          {filtered.length === 0 && (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography sx={{ fontSize: 48, mb: 2 }}>🔍</Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 600 }}>
                No strains found
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.35)", fontSize: 13, mt: 0.5 }}>
                Try a different search or filter
              </Typography>
            </Box>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selected && (
        <StrainDetail
          strain={selected}
          onSelect={(s) => setSelected(s)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
