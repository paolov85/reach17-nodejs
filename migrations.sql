-- Schema del database del catalogo corsi di Reach17
-- Si esegue con: mysql -u root -p < migrations.sql

-- Il client mysql da terminale parla al server in latin1, mentre le tabelle
-- sono utf8mb4: senza questa riga i nomi accentati verrebbero salvati storti
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS reach17;

USE reach17;

-- Tipologie di corso (es. Laurea triennale, Master)
CREATE TABLE course_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Atenei in cui si svolgono i corsi
CREATE TABLE universities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Ogni corso appartiene a una sola tipologia
CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  course_type_id INT NOT NULL,
  FOREIGN KEY (course_type_id) REFERENCES course_types(id)
);

-- Tabella ponte: un corso puo' essere associato a piu' atenei
-- e un ateneo puo' ospitare piu' corsi
CREATE TABLE course_universities (
  course_id INT NOT NULL,
  university_id INT NOT NULL,
  PRIMARY KEY (course_id, university_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
);

-- Dati di esempio, per provare l'API senza doverli inserire a mano

INSERT INTO course_types (name) VALUES
  ('Laurea triennale'),
  ('Laurea magistrale'),
  ('Master'),
  ('Corso di specializzazione');

INSERT INTO universities (name) VALUES
  ('Politecnico di Milano'),
  ('Università di Torino'),
  ('Alma Mater Studiorum - Università di Bologna'),
  ('Università Federico II di Napoli'),
  ('Università Ca'' Foscari Venezia');

INSERT INTO courses (name, course_type_id) VALUES
  ('Sviluppo sostenibile e cooperazione', 1),
  ('Acqua pulita e servizi igienici', 1),
  ('Economia circolare', 2),
  ('Parità di genere e politiche sociali', 2),
  ('Energie rinnovabili', 3),
  ('Agricoltura sostenibile', 4);

-- Un corso può svolgersi in più atenei e un ateneo ospitare più corsi.
-- "Agricoltura sostenibile" resta senza atenei di proposito, per avere
-- un caso di corso non ancora associato a nessuno.
INSERT INTO course_universities (course_id, university_id) VALUES
  (1, 1), (1, 2), (1, 3),
  (2, 4),
  (3, 1), (3, 5),
  (4, 2), (4, 3),
  (5, 1), (5, 4);
