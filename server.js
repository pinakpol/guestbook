const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const db = new sqlite3.Database("guestbook.db");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            avatar TEXT,
            uuid TEXT,
            comment TEXT,
            created DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// ======================================
// ADD ENTRY
// ======================================
app.post("/add", (req, res) => {

    const avatar = req.body.avatar || "Unknown";
    const uuid = req.body.uuid || "";
    const comment = req.body.comment || "";

    if(comment.trim() === "")
    {
        return res.status(400).send("Empty comment");
    }

    db.run(
        `INSERT INTO entries
         (avatar, uuid, comment)
         VALUES (?, ?, ?)`,
        [avatar, uuid, comment],
        function(err)
        {
            if(err)
            {
                console.log(err);
                return res.status(500).send("DB Error");
            }

            res.send("OK");
        }
    );
});

// ======================================
// LIST ENTRIES
// ======================================
app.get("/list", (req, res) => {

    const page =
        parseInt(req.query.page || "1");

    const perPage = 5;

    const offset =
        (page - 1) * perPage;

    db.all(
        `SELECT *
         FROM entries
         ORDER BY id DESC
         LIMIT ?
         OFFSET ?`,
        [perPage, offset],
        (err, rows) =>
        {
            if(err)
                return res.status(500).send("DB Error");

            let output =
                "Guestbook Page " +
                page +
                "\n\n";

            rows.forEach(r =>
            {
                output +=
                    "[" + r.created + "]\n" +
                    r.avatar + "\n" +
                    r.comment + "\n\n";
            });

            if(rows.length === 0)
                output += "No entries.";

            res.send(output);
        }
    );
});

// ======================================
// CLEAR ALL
// ======================================
app.post("/clear", (req, res) => {

    db.run(
        `DELETE FROM entries`,
        [],
        err =>
        {
            if(err)
                return res.status(500).send("DB Error");

            res.send("Guestbook Cleared");
        }
    );
});

// ======================================
// DELETE ONE ENTRY
// ======================================
app.post("/delete/:id", (req, res) => {

    db.run(
        `DELETE FROM entries
         WHERE id=?`,
        [req.params.id],
        err =>
        {
            if(err)
                return res.status(500).send("DB Error");

            res.send("Deleted");
        }
    );
});

// ======================================
// STATS
// ======================================
app.get("/stats", (req, res) => {

    db.get(
        `SELECT
            COUNT(*) AS comments,
            COUNT(DISTINCT uuid) AS visitors
         FROM entries`,
        [],
        (err,row) =>
        {
            if(err)
                return res.status(500).send("DB Error");

            res.json(row);
        }
    );
});

// ======================================

app.listen(PORT, () =>
{
    console.log(
        "Guestbook running on port",
        PORT
    );
});