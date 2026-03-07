# Manual Testing Checklist — Active Slim App

Internal checklist for real-use testing and bug capture. Run in dev (`npm run dev`) to see `[StrainSpotter]` console logs.

---

## 1. Successful Scan Flow

- [ ] Open `/garden` → tap Scanner
- [ ] Upload 1–2+ plant/bud images (PNG/JPG)
- [ ] Tap **Run Scan**
- [ ] See results (primary match, confidence, dominance if applicable)
- [ ] Dev: Console shows `[StrainSpotter] Scan success (backend)` or `[StrainSpotter] Scan success (local)`
- [ ] Open **Log Book** → verify new scan appears with thumbnail and label

---

## 2. Failed / Edge Scan Flow

- [ ] Upload a non-plant image (e.g. screenshot, document) → run scan
- [ ] Expect low-confidence or fallback message; no hard crash
- [ ] Dev: Console shows `[StrainSpotter] Scan failed:` or partial result
- [ ] Optional: Disconnect network, run scan with backend enabled → should fall back to local
- [ ] Dev: Console shows `[StrainSpotter] Backend scan failed, using local` when fallback used

---

## 3. History Save Failure (Local Scan Only)

- [ ] In dev: Simulate save failure (e.g. Supabase down / misconfigured)
- [ ] Run local scan (no `NEXT_PUBLIC_API_BASE` or backend disabled)
- [ ] Scan completes; user sees yellow notice: *"Scan completed but could not save to Log Book. Results are still visible."*
- [ ] Dev: Console shows `[StrainSpotter] History save failed:`

---

## 4. Log Book Verification

- [ ] `/garden/history` → list of scans
- [ ] Each item: thumbnail, strain/cultivar label, confidence, date
- [ ] Tap item → `/garden/history/[id]` shows full detail
- [ ] Scan detail: image, strain name, dominance, notes
- [ ] Grow Coach entry: shows phase/scale/actions/watchouts

---

## 5. Grow Coach Generate & Save

- [ ] Open Grow Coach
- [ ] Pick phase (e.g. Flower), scale (e.g. home)
- [ ] Fill env (temp, humidity) and/or notes
- [ ] Tap **Generate Today's Plan**
- [ ] Plan appears (headline, actions, watchouts)
- [ ] Dev: Console shows `[StrainSpotter] Grow Coach plan generated`
- [ ] Tap **Save Today's Plan to Log Book**
- [ ] Redirect to Log Book; new plan appears
- [ ] Dev: Console shows `[StrainSpotter] Grow Coach plan saved to Log Book` (before redirect)

---

## 6. Grow Coach Save Failure

- [ ] Generate plan
- [ ] In dev: Simulate save failure (e.g. API error)
- [ ] Tap Save → user sees error text (no redirect)
- [ ] Dev: Console shows `[StrainSpotter] Grow Coach save failed:`

---

## 7. Reference-Image Candidate (Dev)

- [ ] Run a high-confidence scan of a known cultivar
- [ ] Dev: Check `[StrainSpotter] History save OK` and no candidate-related errors
- [ ] If candidate creation is wired: check Supabase / reference tables for new candidate

---

## Suggested Real-World Sequence

1. **Happy path**: Dashboard → Scanner → upload 2 images → Run Scan → Log Book → History detail  
2. **Grow Coach**: Generate plan → Save → Log Book → verify plan entry  
3. **Edge case**: Single image scan (confirm modal) → partial/low-confidence result  
4. **Failure path**: Turn off Supabase or network → scan / save → confirm error messages and no crashes  
