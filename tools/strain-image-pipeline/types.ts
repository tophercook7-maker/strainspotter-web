export interface DownloadStats {
  strainsProcessed: number;
  imagesDownloaded: number;
  imagesRejected: number;
  imagesPromoted: number;
}

export interface ImageMetadata {
  source_url?: string;
  strain_name?: string;
  downloaded_at?: string;
  image_type?: "bud" | "whole_plant" | "leaf" | "trichome" | "packaging";
  quality_score?: number;
  blur_detected?: boolean;
  resolution?: { width: number; height: number };
  phash?: string;
  [key: string]: unknown;
}
