const { test, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const request = require('supertest')
const app = require('../src/app')
const db = require('../src/db')

beforeEach(async () => {
  await db.query('DELETE FROM course_universities')
  await db.query('DELETE FROM universities')
  await db.query('ALTER TABLE universities AUTO_INCREMENT = 1')
})

after(async () => {
  await db.end()
})

test('l\'elenco degli atenei è vuoto se non ce ne sono', async () => {
  const risposta = await request(app).get('/universities')

  assert.strictEqual(risposta.status, 200)
  assert.deepStrictEqual(risposta.body, [])
})

test('crea un ateneo e ne legge il dettaglio', async () => {
  const creazione = await request(app)
    .post('/universities')
    .send({ name: 'Politecnico di Milano' })

  assert.strictEqual(creazione.status, 201)

  const dettaglio = await request(app).get('/universities/' + creazione.body.id)

  assert.strictEqual(dettaglio.status, 200)
  assert.strictEqual(dettaglio.body.name, 'Politecnico di Milano')
})

test('conserva le lettere accentate', async () => {
  const creazione = await request(app)
    .post('/universities')
    .send({ name: 'Università di Torino' })

  assert.strictEqual(creazione.body.name, 'Università di Torino')

  const dettaglio = await request(app).get('/universities/' + creazione.body.id)

  assert.strictEqual(dettaglio.body.name, 'Università di Torino')
})

test('non accetta due atenei con lo stesso nome', async () => {
  await request(app).post('/universities').send({ name: 'Alma Mater' })

  const secondo = await request(app)
    .post('/universities')
    .send({ name: 'Alma Mater' })

  assert.strictEqual(secondo.status, 409)
})

test('rifiuta un nome più lungo di cento caratteri', async () => {
  const risposta = await request(app)
    .post('/universities')
    .send({ name: 'a'.repeat(101) })

  assert.strictEqual(risposta.status, 400)
})

test('l\'elenco degli atenei è in ordine alfabetico', async () => {
  await request(app).post('/universities').send({ name: 'Zurigo' })
  await request(app).post('/universities').send({ name: 'Bologna' })
  await request(app).post('/universities').send({ name: 'Milano' })

  const elenco = await request(app).get('/universities')
  const nomi = []

  for (let i = 0; i < elenco.body.length; i++) {
    nomi.push(elenco.body[i].name)
  }

  assert.deepStrictEqual(nomi, ['Bologna', 'Milano', 'Zurigo'])
})

test('modificare un ateneo con il nome di un altro dà 409', async () => {
  await request(app).post('/universities').send({ name: 'Primo' })
  const secondo = await request(app).post('/universities').send({ name: 'Secondo' })

  const modifica = await request(app)
    .put('/universities/' + secondo.body.id)
    .send({ name: 'Primo' })

  assert.strictEqual(modifica.status, 409)
})

test('modificare un ateneo lasciandogli il suo nome è permesso', async () => {
  const creazione = await request(app).post('/universities').send({ name: 'Padova' })

  const modifica = await request(app)
    .put('/universities/' + creazione.body.id)
    .send({ name: 'Padova' })

  assert.strictEqual(modifica.status, 200)
})

test('cancella un ateneo e poi non lo trova più', async () => {
  const creazione = await request(app).post('/universities').send({ name: 'Da cancellare' })

  const cancellazione = await request(app).delete('/universities/' + creazione.body.id)

  assert.strictEqual(cancellazione.status, 204)

  const dettaglio = await request(app).get('/universities/' + creazione.body.id)

  assert.strictEqual(dettaglio.status, 404)
})

test('cancellare un ateneo che non esiste dà 404', async () => {
  const risposta = await request(app).delete('/universities/999')

  assert.strictEqual(risposta.status, 404)
})
