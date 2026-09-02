const express = require('express')
const db = require('../db')

const router = express.Router()

// Elenco dei corsi, ognuno con la sua tipologia e gli atenei in cui si svolge.
// Si può filtrare per nome del corso (anche parziale) e per nome della
// tipologia, con i parametri ?name= e ?type= nell'indirizzo.
// Il LEFT JOIN serve perché un corso non ancora associato a nessun ateneo
// deve comparire lo stesso nell'elenco, con la lista vuota.
router.get('/', async (req, res) => {
  // Le condizioni si aggiungono solo se il filtro è stato passato.
  // Nella query finisce sempre e solo il punto interrogativo: i valori
  // viaggiano a parte, quindi restano prepared statement anche così.
  const condizioni = []
  const parametri = []

  if (req.query.name) {
    condizioni.push('c.name LIKE ?')
    parametri.push('%' + req.query.name + '%')
  }

  if (req.query.type) {
    condizioni.push('t.name = ?')
    parametri.push(req.query.type)
  }

  let filtro = ''

  if (condizioni.length > 0) {
    filtro = 'WHERE ' + condizioni.join(' AND ')
  }

  const [righe] = await db.execute(`
    SELECT c.id, c.name,
           t.id AS course_type_id, t.name AS course_type_name,
           u.id AS university_id, u.name AS university_name
    FROM courses c
    JOIN course_types t ON t.id = c.course_type_id
    LEFT JOIN course_universities cu ON cu.course_id = c.id
    LEFT JOIN universities u ON u.id = cu.university_id
    ${filtro}
    ORDER BY c.name, u.name
  `, parametri)

  // Il database restituisce una riga per ogni coppia corso-ateneo, quindi lo
  // stesso corso torna più volte: qui le righe vengono raggruppate per corso
  const corsi = []

  for (let i = 0; i < righe.length; i++) {
    const riga = righe[i]
    let corso = null

    for (let j = 0; j < corsi.length; j++) {
      if (corsi[j].id === riga.id) {
        corso = corsi[j]
      }
    }

    if (corso === null) {
      corso = {
        id: riga.id,
        name: riga.name,
        courseType: {
          id: riga.course_type_id,
          name: riga.course_type_name
        },
        universities: []
      }
      corsi.push(corso)
    }

    // Con il LEFT JOIN un corso senza atenei ha university_id a null
    if (riga.university_id !== null) {
      corso.universities.push({
        id: riga.university_id,
        name: riga.university_name
      })
    }
  }

  res.json(corsi)
})

// Dettaglio di un singolo corso, con la tipologia e i suoi atenei
router.get('/:id', async (req, res) => {
  const [righe] = await db.execute(`
    SELECT c.id, c.name,
           t.id AS course_type_id, t.name AS course_type_name,
           u.id AS university_id, u.name AS university_name
    FROM courses c
    JOIN course_types t ON t.id = c.course_type_id
    LEFT JOIN course_universities cu ON cu.course_id = c.id
    LEFT JOIN universities u ON u.id = cu.university_id
    WHERE c.id = ?
    ORDER BY u.name
  `, [req.params.id])

  if (righe.length === 0) {
    return res.status(404).json({ error: 'Corso non trovato' })
  }

  const corso = {
    id: righe[0].id,
    name: righe[0].name,
    courseType: {
      id: righe[0].course_type_id,
      name: righe[0].course_type_name
    },
    universities: []
  }

  for (let i = 0; i < righe.length; i++) {
    if (righe[i].university_id !== null) {
      corso.universities.push({
        id: righe[i].university_id,
        name: righe[i].university_name
      })
    }
  }

  res.json(corso)
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

// Associa un ateneo a un corso.
// La rotta sta sotto /courses/:id perché l'associazione appartiene al corso.
router.post('/:id/universities', async (req, res) => {
  const corpo = req.body

  if (!corpo || !corpo.universityId) {
    return res.status(400).json({ error: "Serve l'id dell'ateneo" })
  }

  const ateneoId = corpo.universityId

  const [corsi] = await db.execute(
    'SELECT id FROM courses WHERE id = ?',
    [req.params.id]
  )

  if (corsi.length === 0) {
    return res.status(404).json({ error: 'Corso non trovato' })
  }

  const [atenei] = await db.execute(
    'SELECT id, name FROM universities WHERE id = ?',
    [ateneoId]
  )

  if (atenei.length === 0) {
    return res.status(400).json({ error: "L'ateneo indicato non esiste" })
  }

  // La chiave primaria composta impedisce di inserire due volte la stessa
  // coppia, ma controllo prima per rispondere con un messaggio chiaro
  const [esistenti] = await db.execute(
    'SELECT course_id FROM course_universities WHERE course_id = ? AND university_id = ?',
    [req.params.id, ateneoId]
  )

  if (esistenti.length > 0) {
    return res.status(409).json({ error: 'Il corso è già associato a questo ateneo' })
  }

  await db.execute(
    'INSERT INTO course_universities (course_id, university_id) VALUES (?, ?)',
    [req.params.id, ateneoId]
  )

  res.status(201).json({
    courseId: Number(req.params.id),
    university: {
      id: atenei[0].id,
      name: atenei[0].name
    }
  })
})

// Toglie l'associazione tra un corso e un ateneo.
// Spariscono solo il legame: il corso e l'ateneo restano tutti e due.
router.delete('/:id/universities/:universityId', async (req, res) => {
  const [risultato] = await db.execute(
    'DELETE FROM course_universities WHERE course_id = ? AND university_id = ?',
    [req.params.id, req.params.universityId]
  )

  if (risultato.affectedRows === 0) {
    return res.status(404).json({ error: 'Associazione non trovata' })
  }

  res.status(204).send()
})

module.exports = router
