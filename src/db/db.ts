import Dexie, { type EntityTable } from 'dexie'
import type {
  Account,
  BodyMetric,
  Category,
  DayLog,
  Exercise,
  Goal,
  GoalStep,
  GoalUpdate,
  Habit,
  HabitLog,
  Holding,
  HoldingGroup,
  HoldingMove,
  Price,
  Recurring,
  Settings,
  Snapshot,
  SnapshotBlob,
  StudyItem,
  StudySession,
  Task,
  Transaction,
  Workout,
  WorkoutSet,
  WorkoutTemplate,
} from './schema'

export type GuidodelbueDB = Dexie & {
  dayLogs: EntityTable<DayLog, 'id'>
  goals: EntityTable<Goal, 'id'>
  goalUpdates: EntityTable<GoalUpdate, 'id'>
  goalSteps: EntityTable<GoalStep, 'id'>
  habits: EntityTable<Habit, 'id'>
  habitLogs: EntityTable<HabitLog, 'id'>
  tasks: EntityTable<Task, 'id'>
  studyItems: EntityTable<StudyItem, 'id'>
  studySessions: EntityTable<StudySession, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  categories: EntityTable<Category, 'id'>
  accounts: EntityTable<Account, 'id'>
  holdings: EntityTable<Holding, 'id'>
  holdingMoves: EntityTable<HoldingMove, 'id'>
  prices: EntityTable<Price, 'id'>
  exercises: EntityTable<Exercise, 'id'>
  workouts: EntityTable<Workout, 'id'>
  workoutSets: EntityTable<WorkoutSet, 'id'>
  bodyMetrics: EntityTable<BodyMetric, 'id'>
  holdingGroups: EntityTable<HoldingGroup, 'id'>
  workoutTemplates: EntityTable<WorkoutTemplate, 'id'>
  recurring: EntityTable<Recurring, 'id'>
  settings: EntityTable<Settings, 'id'>
  snapshots: EntityTable<Snapshot, 'id'>
  snapshotBlobs: EntityTable<SnapshotBlob, 'id'>
}

// Versione 1. Ogni modifica allo schema = nuova db.version(n) con .upgrade(),
// senza toccare le versioni precedenti. I booleani non sono indicizzabili in IndexedDB.
const SCHEMA_V1 = {
  dayLogs: 'id, &date, updatedAt',
  goals: 'id, status, source, periodEnd, updatedAt',
  goalUpdates: 'id, goalId, date, [goalId+date], updatedAt',
  goalSteps: 'id, goalId, updatedAt',
  habits: 'id, goalId, updatedAt',
  habitLogs: 'id, habitId, date, [habitId+date], updatedAt',
  tasks: 'id, dueDate, goalId, updatedAt',
  studyItems: 'id, status, subject, nextReview, *tags, updatedAt',
  studySessions: 'id, studyItemId, subject, start, updatedAt',
  transactions: 'id, date, type, categoryId, accountId, recurringId, updatedAt',
  categories: 'id, type, updatedAt',
  accounts: 'id, updatedAt',
  holdings: 'id, groupId, ticker, isin, updatedAt',
  holdingMoves: 'id, holdingId, date, updatedAt',
  prices: 'id, holdingId, date, [holdingId+date], updatedAt',
  exercises: 'id, name, muscleGroup, updatedAt',
  workouts: 'id, date, templateId, type, updatedAt',
  workoutSets: 'id, workoutId, exerciseId, updatedAt',
  bodyMetrics: 'id, date, updatedAt',
  holdingGroups: 'id, updatedAt',
  workoutTemplates: 'id, updatedAt',
  recurring: 'id, updatedAt',
  settings: 'id, updatedAt',
  snapshots: 'id, date, kind, createdAt',
  snapshotBlobs: 'id',
} as const

export const SCHEMA_VERSION = 1

export const db = new Dexie('guidodelbue') as GuidodelbueDB
db.version(1).stores(SCHEMA_V1)

export type TableName = keyof typeof SCHEMA_V1

/** Tabelle con i dati dell'utente: entrano nel backup JSON e nelle copie interne. */
export const DATA_TABLES = (Object.keys(SCHEMA_V1) as TableName[]).filter(
  (t) => t !== 'snapshots' && t !== 'snapshotBlobs',
)
