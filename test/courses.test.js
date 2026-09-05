const { test, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const request = require('supertest')
const app = require('../src/app')
const db = require('../src/db')

// Tabelle vuote prima di ogni test. L'ordine conta: prima le associazioni,
// poi i corsi, poi tipologie e atenei, altrimenti le chiavi esterne
// rifiutano la cancellazione
beforeEach(async () => {
  await db.query('DELETE FROM course_universities')
  await db.query('DELETE FROM courses')
  await db.query('DELETE FROM course_types')
  await db.query('DELETE FROM universities')
  await db.query('ALTER TABLE courses AUTO_INCREMENT = 1')
  await db.query('ALTER TABLE course_types AUTO_INCREMENT = 1')
  await db.query('ALTER TABLE universities AUTO_INCREMENT = 1')
})

after(async () => {
  await db.end()
})

// Prepara una tipologia e restituisce il suo id
async function creaTipologia (nome) {
  const risposta = await request(app).post('/course-types').send({ name: nome })
  return risposta.body.id
}

// Prepara un ateneo e restituisce il suo id
async function creaAteneo (nome) {
  const risposta = await request(app).post('/universities').send({ name: nome })
  return risposta.body.id
}

// Prepara un corso e restituisce il suo id
async function creaCorso (nome, tipologiaId) {
  const risposta = await request(app)
    .post('/courses')
    .send({ name: nome, courseTypeId: tipologiaId })
  return risposta.body.id
}

test('crea un corso e lo restituisce con la sua tipologia', async () => {
  const tipologiaId = await creaTipologia('Laurea triennale')

  const creazione = await request(app)
    .post('/courses')
    .send({ name: 'Acqua pulita', courseTypeId: tipologiaId })

  assert.strictEqual(creazione.status, 201)
  assert.strictEqual(creazione.body.courseType.name, 'Laurea triennale')
})

test('un corso senza atenei compare comunque, con la lista vuota', async () => {
  const tipologiaId = await creaTipologia('Master')
  await creaCorso('Corso isolato', tipologiaId)

  const elenco = await request(app).get('/courses')

  assert.strictEqual(elenco.body.length, 1)
  assert.deepStrictEqual(elenco.body[0].universities, [])
})

test('un corso in più atenei viene restituito una volta sola', async () => {
  const tipologiaId = await creaTipologia('Laurea triennale')
  const corsoId = await creaCorso('Sviluppo sostenibile', tipologiaId)
  const torino = await creaAteneo('Torino')
  const milano = await creaAteneo('Milano')
  const bologna = await creaAteneo('Bologna')

  await request(app).post('/courses/' + corsoId + '/universities').send({ universityId: torino })
  await request(app).post('/courses/' + corsoId + '/universities').send({ universityId: milano })
  await request(app).post('/courses/' + corsoId + '/universities').send({ universityId: bologna })

  const elenco = await request(app).get('/courses')

  assert.strictEqual(elenco.body.length, 1)
  assert.strictEqual(elenco.body[0].universities.length, 3)
})

test('non crea un corso con una tipologia che non esiste', async () => {
  const risposta = await request(app)
    .post('/courses')
    .send({ name: 'Corso fantasma', courseTypeId: 999 })

  assert.strictEqual(risposta.status, 400)
})

test('rifiuta una tipologia indicata con un valore non valido', async () => {
  const zero = await request(app).post('/courses').send({ name: 'X', courseTypeId: 0 })
  const testo = await request(app).post('/courses').send({ name: 'X', courseTypeId: 'abc' })

  assert.strictEqual(zero.status, 400)
  assert.strictEqual(testo.status, 400)
})

test('modifica nome e tipologia di un corso', async () => {
  const triennale = await creaTipologia('Laurea triennale')
  const master = await creaTipologia('Master')
  const corsoId = await creaCorso('Nome vecchio', triennale)

  const modifica = await request(app)
    .put('/courses/' + corsoId)
    .send({ name: 'Nome nuovo', courseTypeId: master })

  assert.strictEqual(modifica.status, 200)
  assert.strictEqual(modifica.body.name, 'Nome nuovo')
  assert.strictEqual(modifica.body.courseType.name, 'Master')
})

test('filtra i corsi per parte del nome, senza distinguere le maiuscole', async () => {
  const tipologiaId = await creaTipologia('Laurea triennale')
  await creaCorso('Agricoltura sostenibile', tipologiaId)
  await creaCorso('Sviluppo sostenibile', tipologiaId)
  await creaCorso('Economia circolare', tipologiaId)

  const risposta = await request(app).get('/courses?name=SOSTENIBILE')

  assert.strictEqual(risposta.body.length, 2)
})

test('filtra i corsi per tipologia', async () => {
  const triennale = await creaTipologia('Laurea triennale')
  const master = await creaTipologia('Master')
  await creaCorso('Corso uno', triennale)
  await creaCorso('Corso due', master)

  const risposta = await request(app).get('/courses?type=Master')

  assert.strictEqual(risposta.body.length, 1)
  assert.strictEqual(risposta.body[0].name, 'Corso due')
})

test('i due filtri insieme si sommano', async () => {
  const triennale = await creaTipologia('Laurea triennale')
  const master = await creaTipologia('Master')
  await creaCorso('Energia sostenibile', triennale)
  await creaCorso('Energia rinnovabile', master)

  const risposta = await request(app).get('/courses?name=energia&type=Master')

  assert.strictEqual(risposta.body.length, 1)
  assert.strictEqual(risposta.body[0].name, 'Energia rinnovabile')
})

test('un tentativo di iniezione nel filtro non restituisce nulla e non fa danni', async () => {
  const tipologiaId = await creaTipologia('Laurea triennale')
  await creaCorso('Un corso', tipologiaId)

  const risposta = await request(app).get("/courses?name=' OR '1'='1")

  assert.strictEqual(risposta.status, 200)
  assert.strictEqual(risposta.body.length, 0)

  // le tabelle devono essere ancora al loro posto
  const dopo = await request(app).get('/courses')

  assert.strictEqual(dopo.body.length, 1)
})

test('associa un ateneo a un corso', async () => {
  const tipologiaId = await creaTipologia('Master')
  const corsoId = await creaCorso('Un corso', tipologiaId)
  const ateneoId = await creaAteneo('Padova')

  const risposta = await request(app)
    .post('/courses/' + corsoId + '/universities')
    .send({ universityId: ateneoId })

  assert.strictEqual(risposta.status, 201)
  assert.strictEqual(risposta.body.university.name, 'Padova')
})

test('non associa due volte lo stesso ateneo allo stesso corso', async () => {
  const tipologiaId = await creaTipologia('Master')
  const corsoId = await creaCorso('Un corso', tipologiaId)
  const ateneoId = await creaAteneo('Padova')

  await request(app).post('/courses/' + corsoId + '/universities').send({ universityId: ateneoId })

  const seconda = await request(app)
    .post('/courses/' + corsoId + '/universities')
    .send({ universityId: ateneoId })

  assert.strictEqual(seconda.status, 409)
})

test('non associa un ateneo a un corso che non esiste', async () => {
  const ateneoId = await creaAteneo('Padova')

  const risposta = await request(app)
    .post('/courses/999/universities')
    .send({ universityId: ateneoId })

  assert.strictEqual(risposta.status, 404)
})

test('toglie l\'associazione lasciando corso e ateneo al loro posto', async () => {
  const tipologiaId = await creaTipologia('Master')
  const corsoId = await creaCorso('Un corso', tipologiaId)
  const ateneoId = await creaAteneo('Padova')

  await request(app).post('/courses/' + corsoId + '/universities').send({ universityId: ateneoId })

  const rimozione = await request(app)
    .delete('/courses/' + corsoId + '/universities/' + ateneoId)

  assert.strictEqual(rimozione.status, 204)

  const corso = await request(app).get('/courses/' + corsoId)
  const atenei = await request(app).get('/universities')

  assert.deepStrictEqual(corso.body.universities, [])
  assert.strictEqual(atenei.body.length, 1)
})

test('togliere un\'associazione che non c\'è dà 404', async () => {
  const risposta = await request(app).delete('/courses/1/universities/1')

  assert.strictEqual(risposta.status, 404)
})

test('cancellare un corso cancella le sue associazioni ma non gli atenei', async () => {
  const tipologiaId = await creaTipologia('Master')
  const corsoId = await creaCorso('Un corso', tipologiaId)
  const primo = await creaAteneo('Padova')
  const secondo = await creaAteneo('Verona')

  await request(app).post('/courses/' + corsoId + '/universities').send({ universityId: primo })
  await request(app).post('/courses/' + corsoId + '/universities').send({ universityId: secondo })

  await request(app).delete('/courses/' + corsoId)

  const atenei = await request(app).get('/universities')
  const [associazioni] = await db.query('SELECT course_id FROM course_universities')

  assert.strictEqual(atenei.body.length, 2)
  assert.strictEqual(associazioni.length, 0)
})
