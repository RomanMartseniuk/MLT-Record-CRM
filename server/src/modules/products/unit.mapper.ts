import { Unit } from '../../../generated/prisma/client.js';

const TO_UA = { pcs: 'шт', l: 'л', kg: 'кг', m: 'м' } as const;
const FROM_UA = { 'шт': 'pcs', 'л': 'l', 'кг': 'kg', 'м': 'm' } as const;

export const unitToUa = (u: Unit) => TO_UA[u];
export const unitFromUa = (s: keyof typeof FROM_UA) => FROM_UA[s];