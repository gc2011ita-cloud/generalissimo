# guidodelbue – piano di progetto

Versione del 21/10/2026

## Visione e principi

Una sola web app installata sulla schermata Home dell'iPhone che risponde a tre domande: cosa devo fare oggi, cosa ho fatto, come è andata. Gli impegni restano nel Calendario di iPhone: l'app non lo duplica. Nome: **guidodelbue**.

Principi da dare a Claude Code come vincoli fissi:

- **Inserimento in meno di 30 secondi** per qualsiasi dato (spesa, serie in palestra, nota). Se un inserimento richiede più tempo, smetterai di farlo.
- **Una schermata "Oggi" al centro**: tutti i moduli confluiscono lì, così apri l'app e vedi subito la giornata.
- **Funziona offline**: i dati vivono sul telefono, la palestra senza campo non è un problema.
- **Moduli collegati, non app separate**: gli obiettivi si misurano da soli leggendo ore di studio, allenamenti e spese.
- **Dati tuoi ed esportabili**: i dati restano solo sull'iPhone, con backup manuale in JSON e promemoria settimanale; export in Markdown e CSV in qualunque momento.
- **Costruita a fasi**: prima i moduli che usi ogni giorno, poi analisi e integrazioni.

Il progetto di app spese stile Orange Dog diventa il modulo Finanze di questa app: una sola codebase, un solo posto per i dati.

## Architettura tecnica

PWA **local-first** solo per iPhone: tutti i dati in IndexedDB sul telefono, nessun database in cloud. L'unico pezzo online è una piccola funzione server che fa due cose: scarica i prezzi una volta al giorno e invia la notifica serale degli obiettivi.

| Livello | Scelta | Perché |
| --- | --- | --- |
| Framework | React + TypeScript + Vite | Lo stack che Claude Code gestisce meglio; tipi utili con molte entità |
| Stile | Tailwind CSS, mobile-first (390 px), tema chiaro/scuro | Veloce da iterare, coerente |
| Dati | Dexie.js su IndexedDB | localStorage non regge query, filtri per data e migliaia di serie/spese |
| Offline/installazione | vite-plugin-pwa (service worker + manifest) | Icona sulla Home, avvio a schermo intero, funziona senza rete |
| Grafici | Recharts | Trend di voto giornata, obiettivi, carichi, spese, patrimonio |
| Hosting | Netlify | Gratuito, deploy automatico da Git, include le funzioni server |
| Funzione server | Netlify Functions (prezzi) + Scheduled Function (notifica serale) | Custodisce la chiave dell'API prezzi; riceve solo l'elenco dei ticker, mai quantità o importi |

### Prezzi degli investimenti, una volta al giorno

- Alla prima apertura della giornata con rete, l'app invia alla funzione l'elenco dei ticker/ISIN e riceve i prezzi di chiusura; c'è anche un pulsante "Aggiorna".
- L'app salva un'istantanea giornaliera del valore del portafoglio: da lì nascono grafico e rendimento.
- Fonte prezzi: un fornitore che copra ETF e azioni europee per ISIN, per esempio [EODHD](https://eodhd.com/financial-summary/V3DL.XETRA), che ha un piano gratuito e piani a pagamento da 19,99 $/mese. Piano gratuito: 20 chiamate al giorno (vedi "Posizioni in portafoglio").
- Valori in valuta estera convertiti in euro con il cambio BCE del giorno.

### Backup manuale

- Export completo in JSON da Impostazioni, salvato su File/iCloud Drive con il foglio di condivisione; import per il ripristino.
- Banner in Oggi se l'ultimo backup ha più di 7 giorni.
- Ogni record ha `id` UUID, `createdAt`, `updatedAt`, `deletedAt` (cancellazione logica); schema Dexie versionato con migrazioni.

### Copie di sicurezza interne

Oltre al backup manuale, l'app salva da sola copie dei dati nel proprio database, pensate per non occupare spazio e non rallentare. Proteggono da errori, cancellazioni sbagliate o aggiornamenti difettosi; non dalla perdita del telefono, per cui resta il backup manuale.

- **Al massimo una al giorno, solo se qualcosa è cambiato**: l'app confronta l'ultima modifica con quella della copia precedente e, se non hai inserito nulla, non salva.
- **Mai all'avvio**: la copia parte qualche secondo dopo che la schermata è pronta, nei momenti di inattività, una tabella alla volta, così l'interfaccia non si blocca.
- **Compressa**: i dati vengono compressi (gzip, nativo in Safari) prima di salvarli; il JSON si riduce di molto.
- **Separata dai dati**: le copie stanno in una tabella a parte che l'app legge solo per mostrarne l'elenco o per un ripristino, quindi non appesantiscono ricerche e grafici.
- **Rotazione**: si tengono le ultime 7 copie giornaliere e 4 settimanali (11 in tutto); le più vecchie si eliminano da sole.
- **Tetto di spazio**: se le copie superano un limite (default 20 MB, modificabile), si eliminano le più vecchie anche prima della rotazione.
- **Cosa non si copia**: i dati ricostruibili, come la cache dell'app.
- **In Impostazioni**: elenco delle copie con data e dimensione, spazio totale occupato, ripristino di una copia (con conferma e una copia automatica dello stato attuale prima di sovrascrivere).

### Cosa sapere su iOS

- I dati di una web app aggiunta alla Home sono esclusi dalla cancellazione automatica dei dati dei siti, ma sono separati da quelli di Safari: inserisci i dati solo dall'app installata.
- Se elimini l'icona dalla Home perdi i dati: per questo il backup manuale è obbligatorio, non facoltativo.
- Le notifiche push funzionano solo per app aggiunte alla Home (da iOS 16.4) e richiedono un invio dal server: è il motivo della funzione serale.
- Nessuna attività in background ad app chiusa: prezzi e stato degli obiettivi si aggiornano quando apri l'app (o quando arriva la notifica serale).
- Nessun accesso diretto a Calendario, Salute (HealthKit) o widget: i ponti possibili passano da Comandi rapidi.

Fonti: [WebKit/iOS e PWA, Monterail](https://monterail.com/blog/pwa-for-apple-ios) · [esenzione dalla cancellazione dati, eCorpIT](https://ecorpit.com/progressive-web-app-development-company/) · [EODHD, esempio di scheda ETF](https://eodhd.com/financial-summary/V3DL.XETRA)

## Moduli

Otto moduli, tutti collegati alla schermata Oggi. Il calendario è escluso: resta quello di iPhone.

### 1. Oggi (dashboard)

- Obiettivi in ritardo o a rischio in cima, con l'azione per aggiornarli.
- Abitudini del giorno da spuntare e task in scadenza.
- Allenamento previsto, spese di oggi, totale mese vs budget.
- Valore del portafoglio e variazione rispetto a ieri.
- Pulsante "Chiudi la giornata" che apre il check-in serale; banner se il backup è vecchio.

### 2. Diario e valutazione della giornata

Check-in serale guidato, massimo 60 secondi, quasi tutto a un tocco. Le risposte alimentano direttamente gli obiettivi (vedi "Configurazione iniziale").

- Voto complessivo della giornata (1–10).
- Soddisfazione (1–5) e stanchezza (1–5).
- Domande sì/no: Mi sono allenato? · Ho studiato? · Ho lavorato troppo? · Ho socializzato? · Ho perso tempo? · Ho mangiato bene e sano?
- "Allenato" e "Studiato" sono già compilate se hai registrato un allenamento o una sessione di studio; puoi correggerle.
- Ora in cui sei andato a letto ieri sera e ora di sveglia stamattina.
- Una cosa da migliorare e nota libera (facoltative).
- Domande modificabili da Impostazioni: aggiungi, togli, riordina.

Vista: calendario a "mappa di calore" con il voto di ogni giorno, trend settimanali e mensili.

### 3. Obiettivi e abitudini

Gli obiettivi li inserisci tu; l'app ne calcola lo stato ogni volta che si apre e ti avvisa quando non sei in linea.

Tipi di obiettivo:

- **Automatici**: il valore lo legge l'app dagli altri moduli. Esempi: "10 h di studio a settimana", "3 allenamenti a settimana", "ristoranti al massimo 150 €/mese", "risparmiare 500 €/mese", "peso corporeo 75 kg entro marzo".
- **Manuali numerici**: aggiorni tu il valore in corso d'opera ("leggere 12 libri nel 2027" → +1 quando ne finisci uno).
- **Sì/no con scadenza**: "iscrizione al corso entro il 30/11", con sotto-passi spuntabili.
- **Abitudini**: ricorrenti per giorni della settimana, con streak e percentuale di completamento.

Ogni obiettivo ha: periodo (settimana, mese, trimestre, anno o date libere), target, direzione ("almeno" o "al massimo"), fonte del dato, eventuale rinnovo automatico al periodo successivo.

Come viene calcolato lo stato:

| Stato | Regola (soglie modificabili) |
| --- | --- |
| Raggiunto | Target raggiunto, o periodo chiuso entro il limite per gli obiettivi "al massimo" |
| In linea | Valore attuale ≥ 90% del valore atteso a questa data |
| In ritardo | Tra 70% e 90% del valore atteso |
| A rischio | Sotto il 70%, oppure il target non è più raggiungibile al tuo ritmo migliore registrato; per "al massimo": la proiezione a fine periodo supera il limite |
| Fermo | Obiettivo manuale non aggiornato da più di N giorni (default 7) |
| Mancato | Periodo chiuso senza raggiungere il target |

Valore atteso = target × frazione di periodo trascorsa (per l'abitudine settimanale: giorni previsti fin qui).

Avvisi:

- banner in Oggi per ogni obiettivo in ritardo, a rischio o fermo;
- numero di obiettivi a rischio sul badge dell'icona;
- notifica serale a orario scelto, solo se c'è qualcosa fuori linea (fase 4);
- a fine periodo: esito, e domanda se rinnovare, modificare o archiviare l'obiettivo.

Vista dettaglio: grafico del valore reale contro la linea del valore atteso, storico degli aggiornamenti.

### 4. Studio e note

Flusso a stati, come una piccola casella di posta dello studio:

1. **Da approfondire**: cattura rapida (titolo, una riga, link o foto).
2. **In studio**: materia/tag, priorità, fonti, appunti estesi in Markdown.
3. **Approfondito**: riassunto finale con i punti chiave.
4. **Da ripassare**: date di ripasso a intervalli crescenti (1, 3, 7, 21 giorni).

In più: timer per sessioni di studio (alimenta gli obiettivi di ore), ricerca a testo libero, esportazione in Markdown.

### 5. Finanze

- Spese ed entrate: importo, data, categoria, conto/carta, nota, flag personale/professionale (utile con la partita IVA).
- Spese ricorrenti (abbonamenti, affitto) generate in automatico.
- Budget mensile per categoria con barra di avanzamento; sforamento = avviso come un obiettivo.
- **Investimenti**: inserisci tu le posizioni (strumento, ISIN/ticker, borsa, valuta, quantità, prezzo medio di carico); i movimenti (acquisto, vendita, PAC, dividendo) aggiornano quantità e prezzo medio.
- Prezzi aggiornati una volta al giorno: valore per posizione, guadagno/perdita in euro e %, peso sul portafoglio, variazione giornaliera.
- Patrimonio netto nel tempo (liquidità + investimenti) e ripartizione per asset class.

### 6. Palestra e corpo

- Schede (template) con esercizi, serie e ripetizioni previste.
- Sessione: per ogni serie carico, ripetizioni, RIR o RPE, con i valori della volta precedente già compilati.
- Timer di recupero automatico dopo ogni serie.
- Storico per esercizio: carico massimo, 1RM stimato (formula di Epley), volume settimanale per gruppo muscolare, record personali evidenziati.
- Attività non in palestra (corsa, bici, montagna): tipo, durata, distanza, dislivello, nota.
- **Peso corporeo e misure** (circonferenze) con grafico: alimentano gli obiettivi di composizione corporea.

### 7. Statistiche e revisione

- Revisione settimanale guidata (domenica): voto medio, ore di studio, allenamenti, spese vs budget, obiettivi raggiunti e mancati, cosa cambiare la settimana dopo.
- Revisione mensile con gli stessi numeri sul mese e l'andamento del patrimonio.
- Correlazioni: voto della giornata contro sonno, allenamento sì/no, ore di studio, spese.

### 8. Impostazioni e backup

- Backup e ripristino JSON, export Markdown (studio) e CSV (spese, allenamenti).
- Aree del check-in, categorie di spesa, conti, esercizi.
- Soglie degli stati degli obiettivi e orario della notifica serale.

## Configurazione iniziale

Valori di partenza da caricare nella Fase 1–3; tutto resta modificabile da Impostazioni.

### Obiettivi da tarare

Le prime due settimane gli obiettivi sono in **osservazione**: l'app registra senza avvisare e alla fine propone come target il tuo valore medio più un piccolo passo. I target qui sotto sono solo il punto di partenza se vuoi saltare l'osservazione.

| Obiettivo | Come si misura | Fonte | Target di partenza |
| --- | --- | --- | --- |
| Studiare | ore a settimana | Timer di studio | almeno 8 h |
| Attività fisica | sessioni a settimana | Modulo Palestra | almeno 3 |
| Socializzare | giorni a settimana con "sì" | Check-in | almeno 2 |
| Perso tempo | giorni a settimana con "sì" | Check-in | al massimo 2 |
| Mangiato bene e sano | giorni a settimana con "sì" | Check-in | almeno 5 |
| Andare a letto presto | giorni a letto entro l'orario scelto (es. 23:30) | Check-in | almeno 5 |
| Svegliarsi presto | giorni con sveglia entro l'orario scelto (es. 7:00) | Check-in | almeno 5 |

"Ho lavorato troppo" e "stanchezza" non sono obiettivi: servono alle statistiche, per vedere se pesano sul voto della giornata e sul sonno. Se vuoi, "lavorato troppo" può diventare un limite (al massimo 2 giorni a settimana).

### Categorie

**Spese**: Tasse · Trasporti · Auto · Spesa alimentare · Ristoranti e bar · Vestiti · Istruzione · Salute · Sport · Vacanze · Altro.

**Entrate**: nessuna categoria predefinita; le crei tu dentro l'app. Le categorie di entrata sono separate da quelle di spesa e non hanno budget.

### Posizioni in portafoglio

Nomi e suddivisione delle posizioni li decidi tu dentro l'app e puoi cambiarli nel corso dell'anno: ogni posizione ha un nome libero e un **gruppo** (creato da te), e grafici e ripartizioni seguono i gruppi. Il ticker serve solo a scaricare il prezzo.

Simboli di partenza, dalla watchlist del 21/10/2026, da usare come `TICKER.MI` (Borsa Italiana): CSSPX · SWDA · IWMO · MEUD · XXSC · SJPA · HSXD · XMME · GOVS · USTH · X57E · EMSA · SDHY.

Copertura prezzi: il piano gratuito di EODHD offre 20 chiamate al giorno ai prezzi di chiusura, sufficienti per 13 strumenti con una chiamata ciascuno al giorno. Se superi circa 18 strumenti, serve il piano a pagamento oppure una chiamata cumulativa ([prezzi EODHD](https://eodhd.com/pricing?via=kmg)). Da fare in Fase 3: una prova reale sui 13 simboli `.MI`, perché alcuni ETF meno scambiati possono avere storico incompleto.

### Icona

Testa di bue stilizzata color crema con corna e muso ocra, su fondo verde scuro: leggibile anche a 60 px sulla Home, coerente con il nome. File forniti in SVG e PNG 180 (apple-touch-icon), 192, 512 e 1024 px.

## Modello dati

Diciannove tabelle coprono tutti i moduli; tutte hanno in più `id`, `createdAt`, `updatedAt`, `deletedAt`. I nomi in inglese aiutano Claude Code, l'interfaccia resta in italiano.

| Tabella | Modulo | Campi principali |
| --- | --- | --- |
| `dayLogs` | Diario | date (unica), overallScore (1–10), satisfaction, tiredness (1–5), answers {domanda: sì/no}, bedtime, wakeTime, improve, note |
| `goals` | Obiettivi | title, kind (auto/manuale/sì-no), source (studyHours/workouts/checkInYes/bedtimeBefore/wakeBefore/spendCategory/savings/bodyWeight…), phase (osservazione/attivo), sourceFilter, target, direction (atLeast/atMost), periodType, periodStart, periodEnd, autoRenew, status, archived |
| `goalUpdates` | Obiettivi | goalId, date, value, note (solo obiettivi manuali) |
| `goalSteps` | Obiettivi | goalId, title, done (sotto-passi degli obiettivi sì/no) |
| `habits` | Obiettivi | name, weekdays\[\], active, goalId? |
| `habitLogs` | Obiettivi | habitId, date, done |
| `tasks` | Obiettivi | title, dueDate, done, goalId? |
| `studyItems` | Studio | title, status, subject, tags\[\], priority, sources\[\], notes (Markdown), summary, nextReview, reviewStep |
| `studySessions` | Studio | studyItemId?, subject, start, minutes |
| `transactions` | Finanze | date, amount, type (spesa/entrata), categoryId, accountId, scope (personale/professionale), note, recurringId? |
| `categories` | Finanze | name, type (spesa/entrata), icon, monthlyBudget (solo spese) |
| `accounts` | Finanze | name, type (conto/carta/contanti), openingBalance |
| `holdings` | Finanze | name (libero), groupId, isin, ticker, exchange, currency, assetClass, quantity, avgPrice |
| `holdingMoves` | Finanze | holdingId, date, type (acquisto/vendita/dividendo), quantity, price, fees |
| `prices` | Finanze | holdingId, date, close, currency, fxToEur |
| `exercises` | Palestra | name, muscleGroup, equipment |
| `workouts` | Palestra | date, templateId?, type (palestra/corsa/bici/montagna…), duration, distance, elevation, note |
| `workoutSets` | Palestra | workoutId, exerciseId, order, weight, reps, rir, isWarmup |
| `bodyMetrics` | Palestra | date, weight, waist, chest, arm, thigh, note |

Tabelle di configurazione: snapshots (copie interne compresse, con data, dimensione e tipo giornaliera/settimanale), holdingGroups (gruppi di posizioni creati da te), `workoutTemplates`, `recurring` (spese ricorrenti), `settings` (soglie, orario notifica, data ultimo backup, data ultimo aggiornamento prezzi).

## Navigazione e UX su iPhone

Barra in basso a cinque voci, con il pulsante centrale "+" per inserire qualsiasi cosa da qualunque schermata.

| Posizione | Voce | Contenuto |
| --- | --- | --- |
| 1 | Oggi | Dashboard, avvisi obiettivi, abitudini, check-in serale |
| 2 | Obiettivi | Obiettivi per stato, abitudini, task, revisioni |
| 3 | + | Foglio rapido: Spesa · Allenamento · Nota da studiare · Aggiorna obiettivo · Peso · Task |
| 4 | Palestra | Sessione in corso, schede, storico, peso e misure |
| 5 | Altro | Studio, Finanze, Statistiche, Impostazioni |

Dettagli da chiedere esplicitamente:

- tastiera numerica (`inputmode="decimal"`) per importi e carichi, categorie e esercizi recenti in cima;
- rispetto delle safe area (notch, barra Home) e `display: standalone`;
- tema scuro automatico, testo minimo 16 px per evitare lo zoom di Safari sui campi;
- schermo sempre acceso durante la sessione in palestra (Screen Wake Lock);
- azioni annullabili ("Annulla" dopo una cancellazione) invece di finestre di conferma;
- link profondi del tipo `/add?tipo=spesa` per aprire direttamente il modulo giusto da Comandi rapidi.

## Integrazioni e suggerimenti

Rispetto all'idea iniziale ho aggiunto tre sezioni (Statistiche e revisione, Peso e misure, Impostazioni e backup) e un sistema di stati per gli obiettivi; il resto sono integrazioni da valutare dopo la Fase 2.

### Già inclusi nel piano

- **Check-in serale unico** per valutazione e soddisfazione: un solo rituale, così non lo salti.
- **Revisione settimanale e mensile** con riepilogo automatico.
- **Statistiche incrociate**: dopo 2–3 mesi di dati mostrano cosa incide davvero sul voto delle tue giornate.
- **Ripasso a intervalli** per il materiale di studio.
- **Progressione suggerita in palestra**: se completi tutte le ripetizioni previste, la volta dopo propone +2,5 kg (regola configurabile).
- **Separazione personale/professionale** nelle spese, con totale annuo per categoria.

### Ponti verso iOS tramite Comandi rapidi

- Azioni rapide dal tasto Azione, da Siri o dal doppio tocco sul retro: "Aggiungi spesa", "Inizia allenamento", "Nota da studiare", tramite i link profondi.
- Automazione serale che apre direttamente il check-in: utile anche come alternativa alla notifica push.
- Aggiungere un evento al Calendario di iPhone da un task o da un obiettivo con scadenza, tramite file .ics: l'app non gestisce il calendario, ma può passargli una data.
- **Dati di Salute** (passi, sonno): Comandi rapidi può leggerli e passarli all'app nell'URL; la PWA non può accedere a HealthKit direttamente. Da provare in fase 4.

### Notifica serale degli obiettivi: come funziona

La funzione programmata su Netlify invia ogni sera una notifica push "vuota"; il service worker sul telefono la riceve, legge gli obiettivi dal database locale e mostra il testo solo con quelli fuori linea (es. "Studio: 4 h su 10, a rischio"). Così i tuoi dati non escono dal telefono. Da verificare in sviluppo che iOS consenta la lettura di IndexedDB alla ricezione della push; in caso contrario la notifica diventa un promemoria generico e il dettaglio compare all'apertura dell'app.

### Estensioni facoltative

- **"Approfondisci con Claude"** su una nota di studio: la versione semplice copia un prompt già pronto e apre l'app Claude; la versione integrata con l'API passa dalla stessa funzione server e ha un costo a consumo.
- **Blocco con Face ID** tramite passkey (WebAuthn) all'apertura dell'app.
- **Import CSV dall'estratto conto** della banca per non inserire a mano le spese con carta.

### Aggiunte approvate

Quattro aggiunte approvate; le prime due vanno nella Fase 2, le altre due nel modulo Finanze della Fase 1.

- **Pausa obiettivi**: un interruttore "vacanza / malattia / periodo intenso" che sospende gli avvisi e non conta quei giorni nel valore atteso.
- **Check-in recuperabile**: se salti la sera, la mattina dopo Oggi ti propone di compilare quello di ieri.
- **Accantonamento tasse della partita IVA**: per ogni entrata professionale l'app calcola la quota da mettere da parte con una percentuale che imposti tu e puoi modificare in qualunque momento da Impostazioni; mostra il totale accantonato contro le scadenze di giugno e novembre.
- **Risparmio del mese**: quanto hai messo da parte ogni mese (entrate − spese) e il totale cumulato dai mesi precedenti fino a quel mese, con grafico mese per mese.

Da valutare più avanti: un riepilogo annuale (anno in numeri: voto medio, ore di studio, allenamenti, spese per categoria, andamento del portafoglio).

## Roadmap a fasi

Cinque fasi; la Fase 1 contiene solo ciò che userai ogni giorno (giornata, palestra, spese), perché un'app generale fallisce quando nasce già troppo grande.

| Fase | Cosa si costruisce | Si passa avanti quando |
| --- | --- | --- |
| 0 – Fondamenta | Progetto React, PWA installabile, database Dexie, barra di navigazione, tema, backup JSON manuale, copie di sicurezza interne | Si apre dalla Home e funziona offline |
| 1 – MVP quotidiano | Oggi, check-in serale, Palestra completa, spese ed entrate con categorie e conti, accantonamento tasse, risparmio del mese | Usata ogni giorno per due settimane |
| 2 – Obiettivi e studio | Obiettivi con stato e avvisi in app, abitudini, pausa obiettivi, check-in recuperabile, studio a stati con ripasso, budget, spese ricorrenti | Due revisioni settimanali fatte |
| 3 – Investimenti e analisi | Posizioni e gruppi, prezzi giornalieri, patrimonio, statistiche incrociate, revisione settimanale e mensile | Prezzi corretti per un mese |
| 4 – Integrazioni | Notifica serale obiettivi, badge, Comandi rapidi, dati Salute, approfondimento con Claude | Si tiene solo ciò che si usa davvero |

Se dopo due settimane non apri l'app ogni giorno, si semplifica l'inserimento prima di aggiungere altri moduli.

## Come farla sviluppare con Claude Code

Dai a Claude Code due file — la specifica (questo documento) e un `CLAUDE.md` con le regole fisse — e fagli costruire una fase alla volta, sempre partendo da un piano.

1. Questo file va nel repository come `docs/SPEC.md`; le icone in `public/icons/`.
2. Crea `CLAUDE.md` nella radice del progetto con il testo qui sotto.
3. Per ogni fase: avvia Claude Code in plan mode, fatti proporre il piano, correggilo, poi fallo eseguire.
4. A fine fase: deploy, prova sull'iPhone dall'icona sulla Home, annota cosa cambiare prima di passare alla fase successiva.
5. Commit a ogni passaggio funzionante, così puoi sempre tornare indietro.

```markdown
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
```

Prompt per iniziare:

```text
Leggi docs/SPEC.md e CLAUDE.md. Realizza solo la Fase 0: progetto Vite + React + TypeScript,
PWA installabile su iPhone (manifest, icone, service worker, funzionamento offline),
database Dexie con lo schema completo del capitolo "Modello dati", barra di navigazione
a cinque voci con schermate vuote, tema chiaro/scuro, backup e ripristino JSON da Impostazioni,
copie di sicurezza interne come da "Copie di sicurezza interne", icone da public/icons/.
Prima proponi il piano e la struttura delle cartelle, poi attendi la mia conferma.
```

## Decisioni

Le scelte di architettura sono chiuse; restano aperti solo i contenuti da inserire nella Fase 0–1.

| Tema | Decisione |
| --- | --- |
| Nome | guidodelbue |
| Dispositivi | Solo iPhone |
| Dati | Solo sul telefono, backup manuale in JSON |
| Calendario | Escluso: si usa quello di iPhone |
| Obiettivi | Inseriti a mano; stato calcolato in automatico con avvisi se fuori linea |
| Spese | L'app spese stile Orange Dog diventa il modulo Finanze |
| Investimenti | Posizioni inserite a mano, prezzi aggiornati online una volta al giorno |

Ancora da definire:

- [ ] Conti e carte da cui escono le spese.
- [ ] Orari soglia per "a letto presto" e "sveglia presto".
- [ ] Verifica in Fase 3 che i 13 simboli `.MI` restituiscano il prezzo corretto.
