const express = require('express')
const courseTypesRoutes = require('./routes/courseTypes')
const universitiesRoutes = require('./routes/universities')
const coursesRoutes = require('./routes/courses')

const app = express()

// Serve a leggere il corpo JSON delle richieste POST e PUT
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'API del catalogo corsi di Reach17' })
})

app.use('/course-types', courseTypesRoutes)
app.use('/universities', universitiesRoutes)
app.use('/courses', coursesRoutes)

// Nessuna delle rotte qui sopra ha risposto: l'indirizzo non esiste
app.use((req, res) => {
  res.status(404).json({ error: 'Risorsa non trovata' })
})

// Gestore centralizzato degli errori. Si riconosce dai quattro parametri:
// Express manda qui tutto quello che va storto nelle rotte, comprese le
// funzioni async che falliscono. Senza, la risposta sarebbe una pagina HTML
// con dentro lo stack trace.
app.use((errore, req, res, next) => {
  // Corpo della richiesta che non è JSON valido: colpa di chi chiama
  if (errore.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Il corpo della richiesta non è JSON valido' })
  }

  // Tutto il resto è un problema nostro: lo scrivo nei log del server e
  // all'utente mando solo un messaggio generico, senza dettagli interni
  console.log('Errore non previsto: ' + errore.message)
  res.status(500).json({ error: 'Errore interno del server' })
})

// L'applicazione viene esportata senza mettersi in ascolto: così i test
// possono usarla senza occupare la porta, e ad avviare il server ci pensa
// server.js
module.exports = app
