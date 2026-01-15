export type TopUp = {
  id: string;
  scans: number;
  doctorScans: number;
  price: number;
};

export const TOP_UPS: TopUp[] = [
  { id: "scan_25", scans: 25, doctorScans: 0, price: 4.99 },
  { id: "scan_50", scans: 50, doctorScans: 0, price: 7.99 },
  { id: "doctor_10", scans: 0, doctorScans: 10, price: 6.99 },
];
