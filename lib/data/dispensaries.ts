export type Dispensary = {
  id: string;
  name: string;
  city: string;
  state: string;
  type: string;
};

export const DISPENSARIES: Dispensary[] = [
  {
    id: "d1",
    name: "Green Leaf Dispensary",
    city: "Denver",
    state: "CO",
    type: "Recreational",
  },
  {
    id: "d2",
    name: "Highland Cannabis",
    city: "Boulder",
    state: "CO",
    type: "Medical & Recreational",
  },
  {
    id: "d3",
    name: "Urban Bloom",
    city: "Los Angeles",
    state: "CA",
    type: "Recreational",
  },
  {
    id: "d4",
    name: "River City Remedies",
    city: "Portland",
    state: "OR",
    type: "Medical",
  },
];
