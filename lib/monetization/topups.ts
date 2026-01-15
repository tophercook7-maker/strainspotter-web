export type TopUpType = "ID_SCAN" | "DOCTOR_SCAN";

export const TOP_UPS = {
  APP: {
    ID_SCAN: [
      { amount: 25, priceHint: 4.99 },
      { amount: 50, priceHint: 7.99 },
    ],
  },

  MEMBER: {
    ID_SCAN: [
      { amount: 50, priceHint: 3.99 },
      { amount: 100, priceHint: 6.99 },
    ],
    DOCTOR_SCAN: [
      { amount: 10, priceHint: 3.99 },
      { amount: 20, priceHint: 4.99 },
    ],
  },
} as const;
