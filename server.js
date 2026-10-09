
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());

const db = new sqlite3.Database(
  path.join(__dirname, "database.db"),
  (err) => {
    if (err) {
      console.error("Database error:", err.message);
    } else {
      console.log("Database connected!");
    }
  }
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      year TEXT,
      branch TEXT,
      cgpa REAL,
      goal TEXT,
      studyTime TEXT
    )
  `);

  // Add new columns if the existing table is older.
  db.all("PRAGMA table_info(students)", (err, columns) => {
    if (err) {
      console.error("Table check failed:", err.message);
      return;
    }

    const existing = columns.map((column) => column.name);

    const additions = [
      ["year", "TEXT"],
      ["branch", "TEXT"],
      ["cgpa", "REAL"],
      ["goal", "TEXT"],
      ["studyTime", "TEXT"]
    ];

    additions.forEach(([name, type]) => {
      if (!existing.includes(name)) {
        db.run(`ALTER TABLE students ADD COLUMN ${name} ${type}`,
          (alterErr) => {
            if (alterErr) {
              console.error(`Could not add ${name}:`, alterErr.message);
            }
          }
        );
      }
    });
  });
});

app.get("/", (req, res) => {
  res.send("Student Success Backend is working! 🚀");
});

// Get all registered students
app.get("/students", (req, res) => {
  db.all("SELECT * FROM students ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: "Could not retrieve students."
      });
    }

    res.json(rows);
  });
});

app.post("/students", (req, res) => {
  const {
    name,
    email = null,
    year,
    branch,
    cgpa,
    goal,
    studyTime
  } = req.body;

  if (!name || !year || !branch || !goal || !studyTime) {
    return res.status(400).json({
      error: "Please provide the required student details."
    });
  }

  const cgpaValue = cgpa === "" || cgpa == null ? null : Number(cgpa);

  if (
    cgpaValue !== null &&
    (!Number.isFinite(cgpaValue) || cgpaValue < 0 || cgpaValue > 10)
  ) {
    return res.status(400).json({
      error: "CGPA must be between 0 and 10."
    });
  }

  db.run(
    `INSERT INTO students
      (name, email, year, branch, cgpa, goal, studyTime)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, email, year, branch, cgpaValue, goal, studyTime],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        message: "Student saved successfully!",
        id: this.lastID
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});