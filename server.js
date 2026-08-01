const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const CLEAR_PASSWORD = "9310134";

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.get("/", async (req, res) =>
{
    try
    {
        await pool.query("SELECT NOW()");

        res.json({
            status: "Online",
            database: "Connected"
        });
    }
    catch(err)
    {
        console.error(err);

        res.status(500).json({
            status: "Database Error"
        });
    }
});

// ===============================
// HOME (FIX: no more Cannot GET /)
// ===============================
app.get("/", (req, res) => {
    res.json({
        status: "OK",
        service: "SL Guestbook",
        endpoints: ["/add", "/list", "/entry", "/stats"]
    });
});

// ===============================
// ADD ENTRY
// ===============================
app.post("/add", (req, res) => {

    const avatar = req.body.avatar || "Unknown";
    const uuid = req.body.uuid || "";
    const comment = (req.body.comment || "").trim();

    if(comment === "")
        return res.status(400).send("Empty comment");

    db.run(
        `INSERT INTO entries (avatar, uuid, comment)
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

// ===============================
// LIST (PAGE VIEW)
// ===============================
app.get("/list", (req, res) => {

    const page = parseInt(req.query.page || "1");
    const perPage = 5;
    const offset = (page - 1) * perPage;

    db.all(
        `SELECT *
         FROM entries
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        [perPage, offset],
        (err, rows) =>
        {
            if(err)
                return res.status(500).send("DB Error");

            let output = "Guestbook Page " + page + "\n\n";

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

// ===============================
// SINGLE ENTRY (FOR DIALOG VIEWER)
// ===============================
app.get("/entry", (req, res) => {

    const index = parseInt(req.query.index || "0");

    db.all(
        `SELECT *
         FROM entries
         ORDER BY id DESC`,
        [],
        (err, rows) =>
        {
            if(err)
                return res.status(500).json({error:true});

            const total = rows.length;

            if(total === 0)
            {
                return res.json({
                    total: 0,
                    avatar: "",
                    comment: "",
                    created: ""
                });
            }

            if(index < 0 || index >= total)
            {
                return res.json({
                    total,
                    avatar: "",
                    comment: "No entry",
                    created: ""
                });
            }

            const row = rows[index];

            res.json({
                total,
                avatar: row.avatar,
                comment: row.comment,
                created: row.created
            });
        }
    );
});

// ===============================
// CLEAR (PASSWORD PROTECTED)
// ===============================
app.post("/clear", (req, res) => {

    const password = req.body.password || "";

    if(password !== CLEAR_PASSWORD)
        return res.status(403).send("Forbidden");

    db.run(`DELETE FROM entries`, [], err => {

        if(err)
            return res.status(500).send("DB Error");

        res.send("Guestbook Cleared");
    });
});

// ===============================
// DELETE (PASSWORD PROTECTED)
// ===============================
app.post("/delete/:id", (req, res) => {

    const password = req.body.password || "";

    if(password !== CLEAR_PASSWORD)
        return res.status(403).send("Forbidden");

    db.run(
        `DELETE FROM entries WHERE id=?`,
        [req.params.id],
        err =>
        {
            if(err)
                return res.status(500).send("DB Error");

            res.send("Deleted");
        }
    );
});

// ===============================
// STATS
// ===============================
app.get("/stats", (req, res) => {

    db.get(
        `SELECT
            COUNT(*) AS comments,
            COUNT(DISTINCT uuid) AS visitors
         FROM entries`,
        [],
        (err, row) =>
        {
            if(err)
                return res.status(500).send("DB Error");

            res.json(row);
        }
    );
});

// ===============================
app.listen(PORT, () => {
    console.log("Guestbook running on port", PORT);
});
