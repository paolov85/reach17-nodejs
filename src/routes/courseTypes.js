const express = require('express')
const db = require('../db')
const { nomeValido } = require('../validation')

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

// Creazione di una nuova tipologia
router.post('/', async (req, res) => {
  // Senza corpo nella richiesta req.body resta undefined, quindi lo controllo
  // prima di leggerne il campo
  const corpo = req.body

  if (!corpo) {
    return res.status(400).json({ error: 'Manca il corpo della richiesta' })
  }

  const nome = nomeValido(corpo.name)

  if (nome === null) {
    return res.status(400).json({ error: 'Il nome della tipologia deve essere un testo da 1 a 100 caratteri' })
  }

  // Il nome deve essere unico: controllo prima di inserire, così posso
  // rispondere con un messaggio chiaro invece di far fallire la query
  const [esistenti] = await db.execute(
    'SELECT id FROM course_types WHERE name = ?',
    [nome]
  )

  if (esistenti.length > 0) {
    return res.status(409).json({ error: 'Esiste già una tipologia con questo nome' })
  }

  const [risultato] = await db.execute(
    'INSERT INTO course_types (name) VALUES (?)',
    [nome]
  )

  res.status(201).json({ id: risultato.insertId, name: nome })
})

// Modifica di una tipologia esistente
router.put('/:id', async (req, res) => {
  const corpo = req.body

  if (!corpo) {
    return res.status(400).json({ error: 'Manca il corpo della richiesta' })
  }

  const nome = nomeValido(corpo.name)

  if (nome === null) {
    return res.status(400).json({ error: 'Il nome della tipologia deve essere un testo da 1 a 100 caratteri' })
  }

  // Il nome nuovo non deve essere già di un'altra tipologia
  const [esistenti] = await db.execute(
    'SELECT id FROM course_types WHERE name = ? AND id != ?',
    [nome, req.params.id]
  )

  if (esistenti.length > 0) {
    return res.status(409).json({ error: 'Esiste già una tipologia con questo nome' })
  }

  const [risultato] = await db.execute(
    'UPDATE course_types SET name = ? WHERE id = ?',
    [nome, req.params.id]
  )

  if (risultato.affectedRows === 0) {
    return res.status(404).json({ error: 'Tipologia non trovata' })
  }

  res.json({ id: Number(req.params.id), name: nome })
})

// Cancellazione di una tipologia
router.delete('/:id', async (req, res) => {
  // Se ci sono corsi di questa tipologia il database rifiuterebbe la
  // cancellazione, quindi lo controllo prima e rispondo con un messaggio chiaro
  const [corsi] = await db.execute(
    'SELECT id FROM courses WHERE course_type_id = ?',
    [req.params.id]
  )

  if (corsi.length > 0) {
    return res.status(409).json({ error: 'Non si può cancellare una tipologia che ha dei corsi' })
  }

  const [risultato] = await db.execute(
    'DELETE FROM course_types WHERE id = ?',
    [req.params.id]
  )

  if (risultato.affectedRows === 0) {
    return res.status(404).json({ error: 'Tipologia non trovata' })
  }

  res.status(204).send()
})

module.exports = router
