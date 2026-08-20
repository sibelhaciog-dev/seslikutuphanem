/**
 * Avatar sistemi.
 *
 * Eski sürümde üç ayrı avatar sistemi vardı (SVG karakter, emoji kostüm ve
 * avataaars.io görselleri). Hepsi tek bir sistemde birleştirildi: çocuk bir
 * karakter seçer, okudukça biriken yıldız puanıyla aksesuar açar.
 */

export interface AvatarCharacter {
  id: string
  name: string
  skin: string
  hair: string
  hairShadow: string
  feminine: boolean
}

export const AVATAR_CHARACTERS: readonly AvatarCharacter[] = [
  {
    id: 'k1',
    name: 'Sarışın Kız',
    skin: '#FDDBB4',
    hair: '#E8C44A',
    hairShadow: '#c8a430',
    feminine: true,
  },
  {
    id: 'k2',
    name: 'Esmer Kız',
    skin: '#FDDBB4',
    hair: '#3a2a1a',
    hairShadow: '#2a1a0a',
    feminine: true,
  },
  {
    id: 'k3',
    name: 'Kızıl Kız',
    skin: '#FDDBB4',
    hair: '#C0392B',
    hairShadow: '#96281b',
    feminine: true,
  },
  {
    id: 'k4',
    name: 'Sarışın Erkek',
    skin: '#FDDBB4',
    hair: '#E8C44A',
    hairShadow: '#c8a430',
    feminine: false,
  },
  {
    id: 'k5',
    name: 'Esmer Erkek',
    skin: '#FDDBB4',
    hair: '#3a2a1a',
    hairShadow: '#2a1a0a',
    feminine: false,
  },
  {
    id: 'k6',
    name: 'Kızıl Erkek',
    skin: '#FDDBB4',
    hair: '#C0392B',
    hairShadow: '#96281b',
    feminine: false,
  },
  {
    id: 'k7',
    name: 'Koyu Ten Kız',
    skin: '#A0704A',
    hair: '#2a1a0a',
    hairShadow: '#1a0a00',
    feminine: true,
  },
  {
    id: 'k8',
    name: 'Koyu Ten Erkek',
    skin: '#A0704A',
    hair: '#2a1a0a',
    hairShadow: '#1a0a00',
    feminine: false,
  },
] as const

export interface AvatarAccessory {
  id: string
  name: string
  emoji: string
  /** Açmak için gereken yıldız puanı. */
  cost: number
}

export const AVATAR_ACCESSORIES: readonly AvatarAccessory[] = [
  { id: 's1', name: 'Taç', emoji: '👑', cost: 3 },
  { id: 's2', name: 'Şapka', emoji: '🎩', cost: 3 },
  { id: 's3', name: 'Yıldız', emoji: '⭐', cost: 3 },
  { id: 's4', name: 'Kelebek Kanadı', emoji: '🦋', cost: 6 },
  { id: 's5', name: 'Çiçek', emoji: '🌸', cost: 6 },
  { id: 's6', name: 'Gökkuşağı', emoji: '🌈', cost: 6 },
  { id: 's7', name: 'Kurdela', emoji: '🎀', cost: 9 },
  { id: 's8', name: 'Pelerin', emoji: '🦸', cost: 9 },
  { id: 's9', name: 'Roket', emoji: '🚀', cost: 9 },
  { id: 's10', name: 'Ejderha', emoji: '🐉', cost: 12 },
  { id: 's11', name: 'Şimşek', emoji: '⚡', cost: 12 },
  { id: 's12', name: 'Kristal', emoji: '🔮', cost: 15 },
] as const

const ACCESSORY_BY_ID = new Map(AVATAR_ACCESSORIES.map((item) => [item.id, item]))

export function getCharacter(id: string | null | undefined): AvatarCharacter {
  return AVATAR_CHARACTERS.find((character) => character.id === id) ?? AVATAR_CHARACTERS[0]!
}

export function getAccessory(id: string): AvatarAccessory | undefined {
  return ACCESSORY_BY_ID.get(id)
}

/** Seçili aksesuarların toplam maliyeti. */
export function spentPoints(accessoryIds: readonly string[]): number {
  return accessoryIds.reduce((total, id) => total + (getAccessory(id)?.cost ?? 0), 0)
}

export function canAfford(
  accessoryIds: readonly string[],
  candidate: AvatarAccessory,
  points: number,
): boolean {
  if (accessoryIds.includes(candidate.id)) return true
  return spentPoints(accessoryIds) + candidate.cost <= points
}
