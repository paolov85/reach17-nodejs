const express = require('express')
const db = require('../db')

const router = express.Router()

// Elenco di tutte le tipologie di corso
router.get('/', async (req, res) => {
  const [tipologie] = await db.query('SELECT id, name FROM course_types ORDER BY name')
  res.json(tipologie)
})

// Dettaglio di una singola tipologia
router.get('/:id', async (req, res) => {
  // execute usa un prepared statement: il punto interrogativo viene sostituito
  // da MySQL, quindi quello che arriva dall'utente non finisce dentro la query
  const [tipologie] = await db.execute(
    'SELECT id, name FROM course_types WHERE id = ?',
    [req.params.id]
  )

  if (tipologie.length === 0) {
    return res.status(404).json({ error: 'Tipologia non trovata' })
  }

  res.json(tipologie[0])
})

module.exports = router
