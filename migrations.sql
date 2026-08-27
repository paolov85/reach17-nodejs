-- Schema del database del catalogo corsi di Reach17
-- Si esegue con: mysql -u root -p < migrations.sql

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
