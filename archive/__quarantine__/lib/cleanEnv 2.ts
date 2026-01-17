/**
 * Strict environment variable sanitizer
 * Removes invisible Unicode characters that cause non-ISO-8859-1 fetch crashes
 * 
 * Only allows printable ASCII characters (0x20-0x7E)
 */

export function cleanEnv(value: string, name: string): string {
  if (!value) {
    return value;
  }

  // Remove all non-printable ASCII characters (keep only 0x20-0x7E)
  const cleaned = value.replace(/[^\x20-\x7E]/g, "");
  
  if (cleaned !== value) {
    console.error(`🚨 ENV CORRUPTION DETECTED IN ${name}`);
    console.error(`Original length: ${value.length}`);
    console.error(`Cleaned length: ${cleaned.length}`);
    console.error(`Removed ${value.length - cleaned.length} invisible characters`);
  }
  
  return cleaned;
}

