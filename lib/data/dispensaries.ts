export type Dispensary = {
  id: string;
  name: string;
  city: string;
  state: string;
  type: string;
};

export const DISPENSARIES: Dispensary[] = [
  {
    id: "1",
    name: "Green Leaf Dispensary",
    city: "Denver",
    state: "CO",
    type: "Recreational",
  },
  {
    id: "2",
    name: "Highland Cannabis",
    city: "Boulder",
    state: "CO",
    type: "Medical & Recreational",
  },
  {
    id: "3",
    name: "Urban Bloom",
    city: "Los Angeles",
    state: "CA",
    type: "Recreational",
  },
  {
    id: "4",
    name: "River City Remedies",
    city: "Portland",
    state: "OR",
    type: "Medical",
  },
];
