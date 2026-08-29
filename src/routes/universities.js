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

// Creazione di un nuovo ateneo
router.post('/', async (req, res) => {
  const corpo = req.body

  if (!corpo || !corpo.name) {
    return res.status(400).json({ error: 'Il nome dell\'ateneo è obbligatorio' })
  }

  const nome = corpo.name

  const [esistenti] = await db.execute(
    'SELECT id FROM universities WHERE name = ?',
    [nome]
  )

  if (esistenti.length > 0) {
    return res.status(409).json({ error: 'Esiste già un ateneo con questo nome' })
  }

  const [risultato] = await db.execute(
    'INSERT INTO universities (name) VALUES (?)',
    [nome]
  )

  res.status(201).json({ id: risultato.insertId, name: nome })
})

// Modifica di un ateneo esistente
router.put('/:id', async (req, res) => {
  const corpo = req.body

  if (!corpo || !corpo.name) {
    return res.status(400).json({ error: 'Il nome dell\'ateneo è obbligatorio' })
  }

  const nome = corpo.name

  const [esistenti] = await db.execute(
    'SELECT id FROM universities WHERE name = ? AND id != ?',
    [nome, req.params.id]
  )

  if (esistenti.length > 0) {
    return res.status(409).json({ error: 'Esiste già un ateneo con questo nome' })
  }

  const [risultato] = await db.execute(
    'UPDATE universities SET name = ? WHERE id = ?',
    [nome, req.params.id]
  )

  if (risultato.affectedRows === 0) {
    return res.status(404).json({ error: 'Ateneo non trovato' })
  }

  res.json({ id: Number(req.params.id), name: nome })
})

// Cancellazione di un ateneo. Le associazioni con i corsi spariscono da sole
// per via dell'ON DELETE CASCADE nello schema: i corsi restano, ma non
// risultano piu' svolti in questo ateneo
router.delete('/:id', async (req, res) => {
  const [risultato] = await db.execute(
    'DELETE FROM universities WHERE id = ?',
    [req.params.id]
  )

  if (risultato.affectedRows === 0) {
    return res.status(404).json({ error: 'Ateneo non trovato' })
  }

  res.status(204).send()
})

module.exports = router
