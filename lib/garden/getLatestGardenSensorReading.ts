import { createServerClient } from "@/app/_server/supabase/server";
import { getPublicGardenId } from "@/lib/garden/getPublicGardenId";

export type GardenSensorReading = {
  id: string;
  garden_id: string;
  temp_f: number | null;
  rh: number | null;
  vpd: number | null;
  ph: number | null;
  nitrogen_ppm: number | null;
  phosphorus_ppm: number | null;
  potassium_ppm: number | null;
  source: string | null;
  recorded_at: string;
  created_at: string;
};

export async function getLatestGardenSensorReading() {
  const supabase = createServerClient();
  const gardenId = await getPublicGardenId(supabase);

  const { data, error } = await supabase
    .from("garden_sensor_readings")
    .select(
      "id,garden_id,temp_f,rh,vpd,ph,nitrogen_ppm,phosphorus_ppm,potassium_ppm,source,recorded_at,created_at"
    )
    .eq("garden_id", gardenId)
    .order("recorded_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  const reading = data && data[0] ? (data[0] as GardenSensorReading) : null;
  return { gardenId, reading };
}
