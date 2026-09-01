# Navigation

Questa spec è orientata a semplificare e uniformare la struttura di navigazione anche nell'ottica di poter condividere i link a qualsiasi systema/pianeta

I link interni di un universo generato dovrebbero avere questa struttura

/<sid>/ -> home (overview dell'univesro generato)
/<sid>/system/66 -> link al sistema
/<sid>/system/66?planet=87-3 -> link al dettaglio del pianeta

la parte <sid> della url deve essere una codifica reversibile dei parametri necessari alla generazione dell'universo in modo che se non esiste un universo in memoria o il sid non corrisponda possa essere generato al volo

## Perché il path e non la query

Oggi i parametri del settore stanno nella query string, ed è la query string che Vue
Router scarta a ogni `router.push('/path')` e `<RouterLink to="/path">`. La correttezza
dipende quindi dal ricordarsi di riportare la query a mano in ogni punto di navigazione
(oggi sono 6, domani di più) — e infatti "OPEN SYSTEM" nel pannello pianeta non lo fa, per
cui `/system/2` ricaricato risponde "System not found in the current sector".

Mettendo il settore nel path l'errore diventa impossibile: se ogni rotta sta sotto `/:sid`,
non si può costruire un link interno senza nominare il settore.

Conseguenza: il lato scrittura di `useSectorLink.ts` (il watch settore -> URL) si può
eliminare. Esiste solo perché URL e store sono due fonti di verità tenute allineate da
watcher; con il sid nel path l'URL è *la* fonte di verità e resta solo il lato lettura
("decodifica il sid, genera se non è quello caricato").

## Decisioni

### 1. Codifica reversibile e leggibile, non un hash

Serve una codifica invertibile, non un digest. E non deve essere opaca: i quattro parametri
non sono segreti, sono scritti sulla home. Base64 costerebbe leggibilità e editabilità a
mano senza comprare nulla.

Formato: `<seed>-<zona>-<systems>-<volume>`, con la zona in forma breve.

    /766207-m-100-1000/system/66

Requisiti del decoder:

- Fallisce piano: sid malformato, zona sconosciuta o numeri fuori range -> redirect a `/`
  con un messaggio, mai una pagina bianca o un settore sbagliato.
- Tollera l'aggiunta futura di un quinto parametro di generazione: campi mancanti = valore
  di default, così i link già condivisi continuano a decodificare.

### 2. Il pianeta ha bisogno di una chiave

I pianeti non hanno id; la chiave è `<starId>-<orbitalNumber>` (es. `87-3`), unica per
costruzione dentro un settore. `/planet` da solo non identifica nulla.

### 3. Il pannello pianeta resta in query

Il pannello pianeta è un overlay, non una pagina: si apre sopra la tabella pianeti della
home *e* sopra il system view. Se il pianeta diventasse un segmento di path, aprirlo dalla
tabella della home porterebbe al system view — e chiudendolo l'utente si ritroverebbe su
un'altra pagina, con i filtri della tabella persi.

Quindi la divisione è per durata, non per estetica:

- **path** = il settore, l'unica cosa che non deve mai perdersi in navigazione;
- **query** = la selezione transitoria del pannello, che se si perde non fa danno.

    /766207-m-100-1000/system/66?planet=87-3

Il link al pianeta resta condivisibile, che è il requisito.

### 4. Coordinate che non tornano

Una URL come `/766207-m-100-1000/system/66?planet=87-3` afferma tre cose insieme: che il
sistema 66 esiste, che esiste un pianeta in orbita 3 attorno alla stella 87, e che la
stella 87 appartiene al sistema 66. Possono essere false separatamente, e non vanno
trattate allo stesso modo.

Il criterio è la differenza fra **assenza** e **contraddizione**. Un pianeta che non esiste
non dice niente sul sistema: è un dato mancante, il resto della URL regge. Una coppia che
si contraddice è invece prova che la URL è corrotta — e allora non c'è ragione di fidarsi
della metà superstite solo perché, presa da sola, risolve. Si torna all'ultimo livello che
non è stato smentito da nulla.

| Caso | Cosa risulta | Dove si va |
|---|---|---|
| A | il sistema esiste, il pianeta no | resta su `/<sid>/system/66`, senza `?planet` |
| B | esistono entrambi ma la stella 87 non è nel sistema 66 | `/<sid>/` |
| C | il sistema non esiste | `/<sid>/` |

In tutti e tre i casi si comunica che le coordinate non sono valide, e si usa `replace` e
non `push`: la URL sbagliata non deve restare nella history, altrimenti "indietro" ci
riporta e rifà scattare l'errore in loop.

Nota sul caso B: non è producibile dall'app, che costruisce sempre la coppia in modo
consistente. Se arriva, è stata scritta o troncata a mano.

### 5. Quando si valida

Mai prima che il settore di quel sid sia caricato. Al seguito di un link il settore non è
in memoria e va generato: validare prima significa trovare tutto inesistente e buttare via
un link valido mostrando un errore falso. Se il sid è già quello caricato — navigazione
interna, o reload di un settore già in memoria — il controllo è immediato e non si aspetta
niente.

Finché la generazione è in corso si **tiene**, non si rifiuta. È lo stesso motivo per cui
`usePlanetDeepLink.ts` oggi tiene la chiave invece di respingerla; quel comportamento va
conservato.

Se la generazione **fallisce**, non è un errore di coordinate: è un errore di generazione e
ha un messaggio suo. Dire all'utente che le coordinate sono sbagliate mentre il vero
problema è che il backend è giù è peggio che non dire niente.

### 6. Come si comunica l'errore

Una striscia inline in cima alla pagina di destinazione, che sparisce da sola o alla prima
interazione.

Non lo stato di errore a piena pagina già esistente (`store.error`, reso in
`HomeView.vue:51`): quello è giusto quando non c'è niente da mostrare, mentre qui la pagina
di destinazione è valida e va mostrata — è solo la coordinata a non esserlo. L'utente
dev'essere lasciato dove può continuare a lavorare, con la spiegazione sopra.

Il componente non esiste: nell'app non c'è né un toast né un banner, va creato.

Due vincoli che discendono dalla decisione 4:

- Il messaggio distingue i casi. "Il pianeta indicato non esiste in questo settore" (A) e
  "le coordinate del link non sono coerenti" (B, C) sono due cose diverse per chi legge, e
  nessuna delle due è l'errore di generazione della decisione 5.
- La striscia non sopravvive al reload. Il `replace` ha già ripulito la URL, quindi
  ricaricare la pagina di destinazione non deve far ricomparire un errore che non è più
  descritto da nessuna parte.

## Da non dimenticare

- `/` resta valida come stato vuoto (c'è "RESTORE LAST SECTOR"): si genera da `/` e alla
  prima generazione si fa `replace` su `/<sid>/`.
- I link nel formato vecchio (`?seed=&zone=&systems=&volume=`) esistono e sono documentati
  in `DocumentationView.vue:296`. Serve un redirect legacy verso il nuovo path, e
  l'aggiornamento della documentazione in-app.
- Test da riscrivere: `composables/sectorLink.dom.test.ts`,
  `components/systemDetail.dom.test.ts`.
