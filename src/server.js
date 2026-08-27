const express = require('express')

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.json({ message: 'API del catalogo corsi di Reach17' })
})

app.listen(port, () => {
  console.log('Server in ascolto sulla porta ' + port)
})
