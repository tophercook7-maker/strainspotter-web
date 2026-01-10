export type Dispensary = {
  id: string;
  name: string;
  city: string;
  state: string;
  type: "Recreational" | "Medical" | "Both";
  rating?: number;
  hours?: string;
};

export const DISPENSARIES: Dispensary[] = [
  {
    id: "co-1",
    name: "Green Valley Dispensary",
    city: "Denver",
    state: "CO",
    type: "Both",
    rating: 4.6,
    hours: "Open until 9pm",
  },
  {
    id: "co-2",
    name: "Bloom Cannabis",
    city: "Boulder",
    state: "CO",
    type: "Recreational",
    rating: 4.4,
    hours: "Open until 10pm",
  },
  {
    id: "ca-1",
    name: "Sunset Herbal",
    city: "Los Angeles",
    state: "CA",
    type: "Both",
    rating: 4.5,
    hours: "Open until 8pm",
  },
];
