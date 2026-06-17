const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

const CLEAR_PASSWORD = "96310134";

app.use(express.json());

const db = new sqlite3.Database("guestbook.db");

db.serialize(() => {

```
db.run(`
    CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        avatar TEXT,
        uuid TEXT,
        comment TEXT,
        created DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);
```

});

// ======================================
// HOME
// ======================================

app.get("/", (req, res) => {

```
res.send("Second Life Guestbook Online");
```

});

// ======================================
// ADD ENTRY
// ======================================

app.post("/add", (req, res) => {

```
const avatar = req.body.avatar || "Unknown";
const uuid = req.body.uuid || "";
const comment = (req.body.comment || "").trim();

if(comment === "")
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
```

});

// ======================================
// LIST PAGE
// ======================================

app.get("/list", (req, res) => {

```
const page = parseInt(req.query.page || "1");
const perPage = 5;
const offset = (page - 1) * perPage;

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
```

});

// ======================================
// SINGLE ENTRY FOR DIALOG VIEWER
// ======================================

app.get("/entry", (req, res) => {

```
const index =
    parseInt(req.query.index || "0");

db.get(
    `SELECT *
     FROM entries
     ORDER BY id DESC
     LIMIT 1 OFFSET ?`,
    [index],
    (err, row) =>
    {
        if(err)
        {
            return res.status(500).json({
                error:true
            });
        }

        db.get(
            `SELECT COUNT(*) AS total
             FROM entries`,
            [],
            (err2, countRow) =>
            {
                if(err2)
                {
                    return res.status(500).json({
                        error:true
                    });
                }

                if(!row)
                {
                    return res.json({
                        total:0
                    });
                }

                res.json({
                    total: countRow.total,
                    avatar: row.avatar,
                    comment: row.comment,
                    created: row.created
                });
            }
        );
    }
);
```

});

// ======================================
// CLEAR ALL
// ======================================

app.post("/clear", (req, res) => {

```
const password =
    req.body.password || "";

if(password !== CLEAR_PASSWORD)
{
    return res
        .status(403)
        .send("Forbidden");
}

db.run(
    `DELETE FROM entries`,
    [],
    err =>
    {
        if(err)
        {
            return res
                .status(500)
                .send("DB Error");
        }

        res.send("Guestbook Cleared");
    }
);
```

});

// ======================================
// DELETE ENTRY
// ======================================

app.post("/delete/:id", (req, res) => {

```
const password =
    req.body.password || "";

if(password !== CLEAR_PASSWORD)
{
    return res
        .status(403)
        .send("Forbidden");
}

db.run(
    `DELETE FROM entries
     WHERE id = ?`,
    [req.params.id],
    err =>
    {
        if(err)
        {
            return res
                .status(500)
                .send("DB Error");
        }

        res.send("Deleted");
    }
);
```

});

// ======================================
// STATS
// ======================================

app.get("/stats", (req, res) => {

```
db.get(
    `SELECT
        COUNT(*) AS comments,
        COUNT(DISTINCT uuid) AS visitors
     FROM entries`,
    [],
    (err,row) =>
    {
        if(err)
        {
            return res
                .status(500)
                .send("DB Error");
        }

        res.json(row);
    }
);
```

});

// ======================================

app.listen(PORT, () =>
{
console.log(
"Guestbook running on port",
PORT
);
});
