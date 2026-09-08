export interface EmergencyNumber { labelKey: string; number: string; descKey: string; }

export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { labelKey: "emergency.nationalEmergency", number: "112", descKey: "emergency.nationalEmergencyDesc" },
  { labelKey: "emergency.police", number: "100", descKey: "emergency.policeDesc" },
  { labelKey: "emergency.womensHelpline", number: "1091", descKey: "emergency.womensHelplineDesc" },
  { labelKey: "emergency.ambulance", number: "108", descKey: "emergency.ambulanceDesc" },
  { labelKey: "emergency.fire", number: "101", descKey: "emergency.fireDesc" },
];

export function telHref(number: string) { return `tel:${number}`; }
