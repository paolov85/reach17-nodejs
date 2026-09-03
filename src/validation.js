// Controlli sui dati che arrivano dal client, raccolti qui perché servono
// uguali in tutte le rotte che scrivono sul database.

// Il nome deve essere una stringa non vuota e non più lunga della colonna,
// che nello schema è VARCHAR(100). Restituisce il nome ripulito dagli spazi
// ai lati, oppure null se non va bene.
function nomeValido (valore) {
  if (typeof valore !== 'string') {
    return null
  }

  const pulito = valore.trim()

  if (pulito === '' || pulito.length > 100) {
    return null
  }

  return pulito
}

// L'id deve essere un numero intero maggiore di zero.
// Restituisce il numero, oppure null se non va bene.
function idValido (valore) {
  if (typeof valore !== 'number' && typeof valore !== 'string') {
    return null
  }

  const numero = Number(valore)

  if (!Number.isInteger(numero) || numero < 1) {
    return null
  }

  return numero
}

module.exports = { nomeValido, idValido }
