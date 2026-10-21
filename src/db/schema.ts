// Tipi di tutte le tabelle (docs/SPEC.md, "Modello dati").
// Date di calendario come 'YYYY-MM-DD', istanti come ISO string, orari come 'HH:mm'.

export type ISODate = string
export type ISODateTime = string
export type HHmm = string

export interface BaseRecord {
  id: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  deletedAt: ISODateTime | null
}

/** Campi gestiti da repo.ts: chi crea un record fornisce solo il resto. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord> & Partial<Pick<T, 'id'>>

// --- Diario ---

export interface DayLog extends BaseRecord {
  date: ISODate
  overallScore: number | null // 1–10
  satisfaction: number | null // 1–5
  tiredness: number | null // 1–5
  answers: Record<string, boolean>
  bedtime: HHmm | null
  wakeTime: HHmm | null
  improve: string
  note: string
}

// --- Obiettivi ---

export type GoalKind = 'auto' | 'manual' | 'yesNo'
export type GoalSource =
  | 'studyHours'
  | 'workouts'
  | 'checkInYes'
  | 'bedtimeBefore'
  | 'wakeBefore'
  | 'spendCategory'
  | 'savings'
  | 'bodyWeight'
  | 'manual'
export type GoalPhase = 'observation' | 'active'
export type GoalDirection = 'atLeast' | 'atMost'
export type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom'
export type GoalStatus = 'achieved' | 'onTrack' | 'behind' | 'atRisk' | 'stale' | 'missed'

export interface Goal extends BaseRecord {
  title: string
  kind: GoalKind
  source: GoalSource
  phase: GoalPhase
  /** Parametro della fonte: domanda del check-in, categoria, orario soglia… */
  sourceFilter: string | null
  target: number
  direction: GoalDirection
  periodType: PeriodType
  periodStart: ISODate
  periodEnd: ISODate
  autoRenew: boolean
  status: GoalStatus | null
  archived: boolean
}

export interface GoalUpdate extends BaseRecord {
  goalId: string
  date: ISODate
  value: number
  note: string
}

export interface GoalStep extends BaseRecord {
  goalId: string
  title: string
  done: boolean
}

export interface Habit extends BaseRecord {
  name: string
  /** 0 = domenica … 6 = sabato */
  weekdays: number[]
  active: boolean
  goalId: string | null
}

export interface HabitLog extends BaseRecord {
  habitId: string
  date: ISODate
  done: boolean
}

export interface Task extends BaseRecord {
  title: string
  dueDate: ISODate | null
  done: boolean
  goalId: string | null
}

// --- Studio ---

export type StudyStatus = 'toExplore' | 'studying' | 'done' | 'toReview'

export interface StudyItem extends BaseRecord {
  title: string
  status: StudyStatus
  subject: string
  tags: string[]
  priority: number
  sources: string[]
  notes: string // Markdown
  summary: string
  nextReview: ISODate | null
  reviewStep: number
}

export interface StudySession extends BaseRecord {
  studyItemId: string | null
  subject: string
  start: ISODateTime
  minutes: number
}

// --- Finanze ---

export type TransactionType = 'expense' | 'income'
export type Scope = 'personal' | 'professional'

export interface Transaction extends BaseRecord {
  date: ISODate
  amount: number
  type: TransactionType
  categoryId: string | null
  accountId: string | null
  scope: Scope
  note: string
  recurringId: string | null
}

export interface Category extends BaseRecord {
  name: string
  type: TransactionType
  icon: string
  /** Solo spese */
  monthlyBudget: number | null
}

export type AccountType = 'bank' | 'card' | 'cash'

export interface Account extends BaseRecord {
  name: string
  type: AccountType
  openingBalance: number
}

export interface Holding extends BaseRecord {
  name: string
  groupId: string | null
  isin: string
  ticker: string
  exchange: string
  currency: string
  assetClass: string
  quantity: number
  avgPrice: number
}

export type HoldingMoveType = 'buy' | 'sell' | 'dividend'

export interface HoldingMove extends BaseRecord {
  holdingId: string
  date: ISODate
  type: HoldingMoveType
  quantity: number
  price: number
  fees: number
}

export interface Price extends BaseRecord {
  holdingId: string
  date: ISODate
  close: number
  currency: string
  fxToEur: number
}

export interface HoldingGroup extends BaseRecord {
  name: string
  order: number
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export interface Recurring extends BaseRecord {
  name: string
  amount: number
  type: TransactionType
  categoryId: string | null
  accountId: string | null
  scope: Scope
  frequency: RecurringFrequency
  /** Giorno del mese (o della settimana per 'weekly') */
  dayOfPeriod: number
  startDate: ISODate
  endDate: ISODate | null
  lastGenerated: ISODate | null
  active: boolean
}

// --- Palestra ---

export interface Exercise extends BaseRecord {
  name: string
  muscleGroup: string
  equipment: string
}

export type WorkoutType = 'gym' | 'run' | 'bike' | 'mountain' | 'other'

export interface Workout extends BaseRecord {
  date: ISODate
  templateId: string | null
  type: WorkoutType
  duration: number | null // minuti
  distance: number | null // km
  elevation: number | null // m
  note: string
}

export interface WorkoutSet extends BaseRecord {
  workoutId: string
  exerciseId: string
  order: number
  weight: number | null
  reps: number | null
  rir: number | null
  isWarmup: boolean
}

export interface WorkoutTemplateItem {
  exerciseId: string
  sets: number
  reps: number
}

export interface WorkoutTemplate extends BaseRecord {
  name: string
  items: WorkoutTemplateItem[]
}

export interface BodyMetric extends BaseRecord {
  date: ISODate
  weight: number | null
  waist: number | null
  chest: number | null
  arm: number | null
  thigh: number | null
  note: string
}

// --- Configurazione ---

export type ThemePreference = 'system' | 'light' | 'dark'

export interface GoalThresholds {
  onTrack: number // 0.9
  behind: number // 0.7
  staleDays: number // 7
}

/** Riga unica con id 'app'. */
export interface Settings extends BaseRecord {
  theme: ThemePreference
  goalThresholds: GoalThresholds
  notificationTime: HHmm
  lastBackupAt: ISODateTime | null
  lastPriceUpdateAt: ISODateTime | null
  snapshotMaxBytes: number
}

/** preRestore: copia dello stato attuale fatta prima di un ripristino */
export type SnapshotKind = 'daily' | 'weekly' | 'preRestore'

export interface Snapshot extends BaseRecord {
  date: ISODate
  kind: SnapshotKind
  /** Dimensione compressa in byte */
  size: number
  /** Massimo updatedAt dei dati copiati */
  dataUpdatedAt: ISODateTime | null
  schemaVersion: number
}

/** Contenuto di una copia (JSON del backup in gzip), in tabella separata
 *  così l'elenco delle copie non carica mai i dati. Stesso id della Snapshot. */
export interface SnapshotBlob extends BaseRecord {
  data: ArrayBuffer
}
