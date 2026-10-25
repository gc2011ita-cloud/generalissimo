// Dati di partenza: categorie, conto e esercizi di base, solo se la tabella è vuota.

import { db } from './db'
import { newId, nowISO } from './repo'
import type { Category, Exercise, TransactionType } from './schema'

const EXPENSE_CATEGORIES: [string, string, number | null][] = [
  ['Casa', '🏠', null],
  ['Alimentari', '🛒', null],
  ['Bar e ristoranti', '☕', null],
  ['Serate e svago', '🎉', null],
  ['Vestiti', '👕', null],
  ['Trasporti', '🚗', null],
  ['Istruzione', '📚', null],
  ['Salute', '🩺', null],
  ['Attività fisica', '🏋️', null],
  ['Viaggi', '✈️', null],
  ['Telefono', '📱', 6],
  ['Regali', '🎁', null],
  ['Tasse', '🧾', null],
]

const INCOME_CATEGORIES: [string, string][] = [
  ['Stipendio', '💼'],
  ['Regalo', '🎁'],
  ['Interessi', '📈'],
  ['Altro', '➕'],
]

export const MUSCLE_GROUPS = [
  'Petto', 'Dorso', 'Spalle', 'Bicipiti', 'Tricipiti', 'Quadricipiti', 'Femorali', 'Glutei', 'Polpacci', 'Core',
] as const

const EXERCISES: [string, (typeof MUSCLE_GROUPS)[number], string][] = [
  ['Panca piana', 'Petto', 'Bilanciere'],
  ['Panca inclinata', 'Petto', 'Manubri'],
  ['Croci ai cavi', 'Petto', 'Cavi'],
  ['Dip', 'Tricipiti', 'Corpo libero'],
  ['Trazioni', 'Dorso', 'Corpo libero'],
  ['Lat machine', 'Dorso', 'Macchina'],
  ['Rematore', 'Dorso', 'Bilanciere'],
  ['Pulley basso', 'Dorso', 'Cavi'],
  ['Stacco da terra', 'Dorso', 'Bilanciere'],
  ['Military press', 'Spalle', 'Bilanciere'],
  ['Alzate laterali', 'Spalle', 'Manubri'],
  ['Face pull', 'Spalle', 'Cavi'],
  ['Curl con bilanciere', 'Bicipiti', 'Bilanciere'],
  ['Curl con manubri', 'Bicipiti', 'Manubri'],
  ['French press', 'Tricipiti', 'Bilanciere'],
  ['Pushdown ai cavi', 'Tricipiti', 'Cavi'],
  ['Squat', 'Quadricipiti', 'Bilanciere'],
  ['Leg press', 'Quadricipiti', 'Macchina'],
  ['Affondi', 'Quadricipiti', 'Manubri'],
  ['Leg extension', 'Quadricipiti', 'Macchina'],
  ['Stacco rumeno', 'Femorali', 'Bilanciere'],
  ['Leg curl', 'Femorali', 'Macchina'],
  ['Hip thrust', 'Glutei', 'Bilanciere'],
  ['Calf raise', 'Polpacci', 'Macchina'],
  ['Plank', 'Core', 'Corpo libero'],
  ['Crunch', 'Core', 'Corpo libero'],
]

const base = () => {
  const now = nowISO()
  return { id: newId(), createdAt: now, updatedAt: now, deletedAt: null }
}

export function defaultCategories(): Category[] {
  const make = (type: TransactionType) => (name: string, icon: string, budget: number | null, i: number): Category => ({
    ...base(), name, type, icon, monthlyBudget: budget, order: i, hidden: false,
  })
  return [
    ...EXPENSE_CATEGORIES.map(([n, icon, b], i) => make('expense')(n, icon, b, i)),
    ...INCOME_CATEGORIES.map(([n, icon], i) => make('income')(n, icon, null, i)),
  ]
}

export function defaultExercises(): Exercise[] {
  return EXERCISES.map(([name, muscleGroup, equipment]) => ({ ...base(), name, muscleGroup, equipment }))
}

export async function ensureSeedData() {
  await db.transaction('rw', db.categories, db.accounts, db.exercises, async () => {
    if ((await db.categories.count()) === 0) await db.categories.bulkAdd(defaultCategories())
    if ((await db.accounts.count()) === 0) {
      await db.accounts.add({ ...base(), name: 'Principale', type: 'bank', openingBalance: 0 })
    }
    if ((await db.exercises.count()) === 0) await db.exercises.bulkAdd(defaultExercises())
  })
}
