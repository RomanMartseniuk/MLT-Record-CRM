import { Unit } from '../../generated/prisma/client.js';

const TO_UA = { PCS: 'шт', L: 'л', KG: 'кг', M: 'м' } as const satisfies Record<Unit, string>;
const FROM_UA = { 'шт': 'PCS', 'л': 'L', 'кг': 'KG', 'м': 'M' } as const satisfies Record<string, Unit>;

export const unitToUa = (u: Unit) => TO_UA[u];
export const unitFromUa = (s: keyof typeof FROM_UA): Unit => FROM_UA[s];
