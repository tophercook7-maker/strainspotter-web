export type ExternalStrainSource = "budprofiles" | "straincompass";

export type NormalizedExternalStrain = {
  slug: string;
  name: string;
  type?: string | null;
  thcMin?: number | null;
  thcMax?: number | null;
  cbdMin?: number | null;
  cbdMax?: number | null;
  effects?: unknown[];
  flavors?: unknown[];
  terpenes?: unknown[];
  lineage?: string | null;
  breeder?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  source: ExternalStrainSource;
  sourceUrl?: string | null;
  raw?: unknown;
};

export type ProviderStatus =
  | "enabled"
  | "enabled_metadata_only"
  | "disabled_missing_key"
  | "disabled_by_config";

export type StrainDataProvider = {
  id: ExternalStrainSource;
  status(): ProviderStatus;
  searchStrains(query: string, limit?: number): Promise<NormalizedExternalStrain[]>;
  getStrainCandidates?(query: string, limit?: number): Promise<NormalizedExternalStrain[]>;
  getStrainByName(name: string): Promise<NormalizedExternalStrain | null>;
  getStrainBySlug?(slug: string): Promise<NormalizedExternalStrain | null>;
};
