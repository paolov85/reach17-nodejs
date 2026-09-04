const app = require('./app')
const db = require('./db')

const port = 3000

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
