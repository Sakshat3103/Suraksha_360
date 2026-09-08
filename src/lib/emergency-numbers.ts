export interface EmergencyNumber { label: string; number: string; description: string; }

export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { label: "National Emergency", number: "112", description: "All-in-one emergency response" },
  { label: "Police", number: "100", description: "Nearest police station / patrol" },
  { label: "Women's Helpline", number: "1091", description: "24x7 national helpline for women in distress" },
  { label: "Ambulance", number: "108", description: "Free emergency medical response" },
  { label: "Fire", number: "101", description: "Fire and rescue services" },
];

export function telHref(number: string) { return `tel:${number}`; }
