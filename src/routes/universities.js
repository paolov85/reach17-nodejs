const express = require('express')
const db = require('../db')

const router = express.Router()

// Elenco di tutti gli atenei
router.get('/', async (req, res) => {
  const [atenei] = await db.query('SELECT id, name FROM universities ORDER BY name')
  res.json(atenei)
})

// Dettaglio di un singolo ateneo
router.get('/:id', async (req, res) => {
  const [atenei] = await db.execute(
    'SELECT id, name FROM universities WHERE id = ?',
    [req.params.id]
  )

  if (atenei.length === 0) {
    return res.status(404).json({ error: 'Ateneo non trovato' })
  }

  res.json(atenei[0])
})

module.exports = router
