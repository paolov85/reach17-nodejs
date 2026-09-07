# Reach17 API

API REST per il catalogo corsi di Reach17, scuola di formazione che costruisce i
propri corsi attorno agli Obiettivi di Sviluppo Sostenibile delle Nazioni Unite.

Progetto del modulo Node.js del Master Web Developer Full Stack di start2impact.

Gestisce tipologie di corso, atenei e corsi, con l'associazione molti-a-molti fra
corsi e atenei: un corso può svolgersi in più atenei, e un ateneo può ospitare
più corsi. Risponde in JSON e non ha interfaccia grafica.

## Avvio

Servono Node.js 18 o superiore e MySQL 8 o superiore.

```
npm install
mysql -u root -p < migrations.sql
cp .env.example .env
npm start
```

In `.env` vanno i propri dati di accesso al database. Il server risponde su
`http://localhost:3000`; con `npm run dev` si riavvia a ogni modifica.

## Endpoint

| Metodo | Indirizzo | Cosa fa |
|---|---|---|
| GET, POST | `/course-types` | elenco e creazione delle tipologie |
| GET, PUT, DELETE | `/course-types/:id` | una tipologia |
| GET, POST | `/universities` | elenco e creazione degli atenei |
| GET, PUT, DELETE | `/universities/:id` | un ateneo |
| GET, POST | `/courses` | elenco con tipologia e atenei, e creazione |
| GET, PUT, DELETE | `/courses/:id` | un corso |
| POST | `/courses/:id/universities` | associa un ateneo al corso |
| DELETE | `/courses/:id/universities/:universityId` | toglie l'associazione |

L'elenco dei corsi accetta due filtri, usabili anche insieme: `?name=` cerca
dentro il nome senza distinguere maiuscole e minuscole, `?type=` seleziona una
tipologia per nome esatto.

```
curl "http://localhost:3000/courses?name=sostenibile&type=Laurea%20triennale"
```

```json
[
  {
    "id": 1,
    "name": "Sviluppo sostenibile e cooperazione",
    "courseType": { "id": 1, "name": "Laurea triennale" },
    "universities": [
      { "id": 3, "name": "Alma Mater Studiorum - Università di Bologna" },
      { "id": 1, "name": "Politecnico di Milano" },
      { "id": 2, "name": "Università di Torino" }
    ]
  }
]
```

## Test

```
npm test
```

Sono 35 test con `node:test` e supertest, che verificano risposte e codici di
stato di tutti gli endpoint. Svuotano le tabelle prima di ogni verifica, quindi
cancellano i dati di esempio: per rimetterli, rieseguire `migrations.sql`.

## Note

Ogni valore che arriva dal client passa nelle query come parametro di un
prepared statement, mai concatenato nel testo SQL. Le credenziali stanno in
`.env`, che non è versionato: nel repository c'è solo `.env.example`.
