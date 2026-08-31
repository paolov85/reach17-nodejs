const express = require('express')
const db = require('../db')

const router = express.Router()

// Elenco dei corsi, ognuno con la sua tipologia.
// Nella tabella courses c'è solo course_type_id, quindi serve il JOIN
// per portarsi dietro anche il nome della tipologia.
router.get('/', async (req, res) => {
  const [righe] = await db.query(`
    SELECT c.id, c.name, t.id AS course_type_id, t.name AS course_type_name
    FROM courses c
    JOIN course_types t ON t.id = c.course_type_id
    ORDER BY c.name
  `)

  const corsi = []

  for (let i = 0; i < righe.length; i++) {
    corsi.push({
      id: righe[i].id,
      name: righe[i].name,
      courseType: {
        id: righe[i].course_type_id,
        name: righe[i].course_type_name
      }
    })
  }

  res.json(corsi)
})

// Dettaglio di un singolo corso con la sua tipologia
router.get('/:id', async (req, res) => {
  const [righe] = await db.execute(`
    SELECT c.id, c.name, t.id AS course_type_id, t.name AS course_type_name
    FROM courses c
    JOIN course_types t ON t.id = c.course_type_id
    WHERE c.id = ?
  `, [req.params.id])

  if (righe.length === 0) {
    return res.status(404).json({ error: 'Corso non trovato' })
  }

  res.json({
    id: righe[0].id,
    name: righe[0].name,
    courseType: {
      id: righe[0].course_type_id,
      name: righe[0].course_type_name
    }
  })
})

// Creazione di un nuovo corso
router.post('/', async (req, res) => {
  const corpo = req.body

  if (!corpo || !corpo.name || !corpo.courseTypeId) {
    return res.status(400).json({ error: 'Servono il nome del corso e la tipologia' })
  }

  const nome = corpo.name
  const tipologiaId = corpo.courseTypeId

  // La tipologia deve esistere davvero: senza questo controllo l'inserimento
  // fallirebbe sulla chiave esterna, con un errore poco comprensibile
  const [tipologie] = await db.execute(
    'SELECT id, name FROM course_types WHERE id = ?',
    [tipologiaId]
  )

  if (tipologie.length === 0) {
    return res.status(400).json({ error: 'La tipologia indicata non esiste' })
  }

  const [risultato] = await db.execute(
    'INSERT INTO courses (name, course_type_id) VALUES (?, ?)',
    [nome, tipologiaId]
  )

  res.status(201).json({
    id: risultato.insertId,
    name: nome,
    courseType: {
      id: tipologie[0].id,
      name: tipologie[0].name
    }
  })
})

// Modifica di un corso esistente
router.put('/:id', async (req, res) => {
  const corpo = req.body

  if (!corpo || !corpo.name || !corpo.courseTypeId) {
    return res.status(400).json({ error: 'Servono il nome del corso e la tipologia' })
  }

  const nome = corpo.name
  const tipologiaId = corpo.courseTypeId

  const [tipologie] = await db.execute(
    'SELECT id, name FROM course_types WHERE id = ?',
    [tipologiaId]
  )

  if (tipologie.length === 0) {
    return res.status(400).json({ error: 'La tipologia indicata non esiste' })
  }

  const [risultato] = await db.execute(
    'UPDATE courses SET name = ?, course_type_id = ? WHERE id = ?',
    [nome, tipologiaId, req.params.id]
  )

  if (risultato.affectedRows === 0) {
    return res.status(404).json({ error: 'Corso non trovato' })
  }

  res.json({
    id: Number(req.params.id),
    name: nome,
    courseType: {
      id: tipologie[0].id,
      name: tipologie[0].name
    }
  })
})

// Cancellazione di un corso. Le associazioni con gli atenei spariscono da sole
// per l'ON DELETE CASCADE nello schema, mentre gli atenei restano
router.delete('/:id', async (req, res) => {
  const [risultato] = await db.execute(
    'DELETE FROM courses WHERE id = ?',
    [req.params.id]
  )

  if (risultato.affectedRows === 0) {
    return res.status(404).json({ error: 'Corso non trovato' })
  }

  res.status(204).send()
})

module.exports = router
