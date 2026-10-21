# guidodelbue – regole di progetto

- Specifica completa in docs/SPEC.md. Lavora solo sulla fase richiesta.
- App solo per iPhone, installata sulla Home. Nessun database in cloud: tutti i dati in IndexedDB.
- Stack: React + TypeScript + Vite, Tailwind CSS, Dexie.js, vite-plugin-pwa, Recharts.
  Nessuna altra dipendenza senza chiedere.
- Unico backend: Netlify Functions in netlify/functions/ (prezzi giornalieri, notifica serale).
  Alla funzione prezzi si inviano solo ticker/ISIN, mai quantità o importi.
  Chiavi API solo nelle variabili d'ambiente di Netlify, mai nel codice client.
- Interfaccia in italiano; codice, tipi e nomi delle tabelle in inglese.
- Mobile-first: progetta per 390 px di larghezza, safe area iOS, tema chiaro e scuro,
  testo nei campi almeno 16 px.
- Ogni modulo in src/modules/<nome>/ (componenti, hook, query Dexie).
- Ogni record ha id (UUID), createdAt, updatedAt, deletedAt. Nessuna cancellazione fisica.
- Schema Dexie versionato: ogni modifica = nuova versione con migrazione.
- Calcoli (stato obiettivi, 1RM, budget, streak, ripasso, rendimenti) in funzioni pure con test Vitest.
- Un task è finito solo con build senza errori e test verdi.
