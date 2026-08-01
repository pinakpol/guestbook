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

//==================================================
// ADD ENTRY
//==================================================

app.post("/add", async (req, res) =>
{
    try
    {
        const avatar = req.body.avatar || "Unknown";
        const uuid = req.body.uuid || "";
        const comment = (req.body.comment || "").trim();

        if(comment == "")
            return res.status(400).send("Empty comment");

        await pool.query(
            `INSERT INTO guestbook_entries
            (avatar, uuid, comment)
            VALUES ($1,$2,$3)`,
            [avatar, uuid, comment]
        );

        res.send("OK");
    }
    catch(err)
    {
        console.error(err);
        res.status(500).send("Database Error");
    }
});
//==================================================
// LIST
//==================================================

app.get("/list", async (req,res)=>
{
    try
    {
        const page =
            parseInt(req.query.page || "1");

        const perPage = 5;

        const offset =
            (page-1)*perPage;

        const result =
            await pool.query(

            `SELECT *
             FROM guestbook_entries
             ORDER BY id DESC
             OFFSET $1
             LIMIT $2`,

            [offset,perPage]

        );

        let output =
            "Guestbook Page " +
            page +
            "\n\n";

        if(result.rows.length==0)
        {
            output +=
                "No entries.";
        }
        else
        {
            result.rows.forEach(r=>
            {
                output +=
                    "[" +
                    r.created +
                    "]\n" +

                    r.avatar +
                    "\n" +

                    r.comment +
                    "\n\n";
            });
        }

        res.send(output);

    }
    catch(err)
    {
        console.error(err);
        res.status(500).send("Database Error");
    }

});

//==================================================
// SINGLE ENTRY
//==================================================

app.get("/entry", async (req,res)=>
{
    try
    {
        const index =
            parseInt(req.query.index || "0");

        const totalResult =
            await pool.query(
                "SELECT COUNT(*) FROM guestbook_entries"
            );

        const total =
            parseInt(totalResult.rows[0].count);

        if(total == 0)
        {
            return res.json({
                total:0,
                avatar:"",
                comment:"",
                created:""
            });
        }

        const result =
            await pool.query(

            `SELECT *
             FROM guestbook_entries
             ORDER BY id DESC
             OFFSET $1
             LIMIT 1`,

            [index]

        );

        if(result.rows.length == 0)
        {
            return res.json({
                total:total,
                avatar:"",
                comment:"",
                created:""
            });
        }

        const row =
            result.rows[0];

        res.json({
            total:total,
            avatar:row.avatar,
            comment:row.comment,
            created:row.created
        });

    }
    catch(err)
    {
        console.error(err);
        res.status(500).send("Database Error");
    }

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
