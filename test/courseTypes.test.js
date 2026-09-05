const { test, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const request = require('supertest')
const app = require('../src/app')
const db = require('../src/db')

// Ogni test parte da tabelle vuote, così il risultato non dipende da quello
// che hanno lasciato i test precedenti né dai dati di esempio
beforeEach(async () => {
  await db.query('DELETE FROM course_universities')
  await db.query('DELETE FROM courses')
  await db.query('DELETE FROM course_types')
  await db.query('ALTER TABLE course_types AUTO_INCREMENT = 1')
})

// Senza chiudere il pool il processo dei test resterebbe appeso
after(async () => {
  await db.end()
})

test('l\'elenco delle tipologie è vuoto se non ce ne sono', async () => {
  const risposta = await request(app).get('/course-types')

  assert.strictEqual(risposta.status, 200)
  assert.deepStrictEqual(risposta.body, [])
})

test('crea una tipologia e la ritrova nell\'elenco', async () => {
  const creazione = await request(app)
    .post('/course-types')
    .send({ name: 'Laurea triennale' })

  assert.strictEqual(creazione.status, 201)
  assert.strictEqual(creazione.body.name, 'Laurea triennale')

  const elenco = await request(app).get('/course-types')

  assert.strictEqual(elenco.body.length, 1)
  assert.strictEqual(elenco.body[0].name, 'Laurea triennale')
})

test('non accetta due tipologie con lo stesso nome', async () => {
  await request(app).post('/course-types').send({ name: 'Master' })

  const seconda = await request(app)
    .post('/course-types')
    .send({ name: 'Master' })

  assert.strictEqual(seconda.status, 409)
})

test('rifiuta un nome vuoto o fatto di soli spazi', async () => {
  const vuoto = await request(app).post('/course-types').send({ name: '' })
  const spazi = await request(app).post('/course-types').send({ name: '   ' })

  assert.strictEqual(vuoto.status, 400)
  assert.strictEqual(spazi.status, 400)
})

test('toglie gli spazi ai lati del nome prima di salvarlo', async () => {
  const risposta = await request(app)
    .post('/course-types')
    .send({ name: '   Dottorato   ' })

  assert.strictEqual(risposta.body.name, 'Dottorato')
})

test('il dettaglio di una tipologia che non esiste risponde 404', async () => {
  const risposta = await request(app).get('/course-types/999')

  assert.strictEqual(risposta.status, 404)
})

test('modifica il nome di una tipologia', async () => {
  const creazione = await request(app)
    .post('/course-types')
    .send({ name: 'Laurea' })

  const modifica = await request(app)
    .put('/course-types/' + creazione.body.id)
    .send({ name: 'Laurea magistrale' })

  assert.strictEqual(modifica.status, 200)
  assert.strictEqual(modifica.body.name, 'Laurea magistrale')

  const dettaglio = await request(app).get('/course-types/' + creazione.body.id)

  assert.strictEqual(dettaglio.body.name, 'Laurea magistrale')
})

test('cancella una tipologia e poi non la trova più', async () => {
  const creazione = await request(app)
    .post('/course-types')
    .send({ name: 'Da cancellare' })

  const cancellazione = await request(app).delete('/course-types/' + creazione.body.id)

  assert.strictEqual(cancellazione.status, 204)

  const dettaglio = await request(app).get('/course-types/' + creazione.body.id)

  assert.strictEqual(dettaglio.status, 404)
})

test('non cancella una tipologia che ha dei corsi', async () => {
  const creazione = await request(app)
    .post('/course-types')
    .send({ name: 'Con corsi' })

  await request(app)
    .post('/courses')
    .send({ name: 'Un corso qualsiasi', courseTypeId: creazione.body.id })

  const cancellazione = await request(app).delete('/course-types/' + creazione.body.id)

  assert.strictEqual(cancellazione.status, 409)
})
