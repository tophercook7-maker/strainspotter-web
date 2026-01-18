// lib/scanner/vaultSignals.ts

export interface VaultImageSignals {
  morphology?: "dense" | "airy" | "foxtailed";
  trichomeDensity?: "low" | "medium" | "heavy";
  coloration?: string[];
}

export interface VaultMetadataSignals {
  suspectedFamilies?: string[];
  knownCultivarNames?: string[];
  aromaHints?: string[];
  reportedEffects?: string[];
}

export interface VaultSignals {
  image: VaultImageSignals;
  metadata: VaultMetadataSignals;
}
