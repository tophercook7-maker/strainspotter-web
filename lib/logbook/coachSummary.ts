export function coachSummary(trends: any) {
  const out: string[] = [];

  if (trends.logs > 0)
    out.push("You logged more consistently this grow. Better memory = better decisions.");

  if (trends.logs < 0)
    out.push("Fewer logs than last grow — consider daily notes to spot issues earlier.");

  if (trends.photos > 0)
    out.push("More photos this grow. Visual tracking improves early problem detection.");

  if (trends.photos < 0)
    out.push("Fewer photos than last grow. Try logging photos at each stage.");

  if (trends.streak > 0)
    out.push("Stronger streak detected. Consistency is improving your process.");

  if (trends.streak < 0)
    out.push("Shorter streak than last grow. Consistency may be slipping.");

  if (out.length === 0)
    out.push("This grow is tracking similarly to your last one. Small changes may create big gains.");

  return out;
}
