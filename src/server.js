const express = require('express')
const db = require('./db')
const courseTypesRoutes = require('./routes/courseTypes')
const universitiesRoutes = require('./routes/universities')

const app = express()
const port = 3000

// Serve a leggere il corpo JSON delle richieste POST e PUT
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'API del catalogo corsi di Reach17' })
})

app.use('/course-types', courseTypesRoutes)
app.use('/universities', universitiesRoutes)

// Controllo all'avvio che il database risponda
db.query('SELECT 1')
  .then(() => {
    console.log('Connessione al database riuscita')
  })
  .catch((errore) => {
    console.log('Errore di connessione al database: ' + errore.message)
  })

app.listen(port, () => {
  console.log('Server in ascolto sulla porta ' + port)
})
