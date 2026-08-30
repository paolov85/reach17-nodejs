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

module.exports = router
