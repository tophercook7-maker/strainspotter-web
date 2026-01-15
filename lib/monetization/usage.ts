export type Usage = {
  scansUsed: number;
  doctorScansUsed: number;
};

export function getUsage(userId: string): Usage {
  return {
    scansUsed: 0,
    doctorScansUsed: 0,
  };
}

export function incrementUsage(
  usage: Usage,
  type: "scan" | "doctor",
  amount = 1
): Usage {
  return {
    scansUsed: usage.scansUsed + (type === "scan" ? amount : 0),
    doctorScansUsed:
      usage.doctorScansUsed + (type === "doctor" ? amount : 0),
  };
}
