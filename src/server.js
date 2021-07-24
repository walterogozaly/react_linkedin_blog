import express from "express";
import bodyParser from "body-parser";
import { MongoClient } from "mongodb";
import path from "path";

const app = express();

app.use(express.static(path.join(__dirname, "/build")));

/* This parses the JSON that we'll include in our post requests
and adds a .body property to our request (req). So if we include a
name property in our JSON that we send, we could access it at
req.body.name
 */
app.use(bodyParser.json());

/* to keep code DRY, this function with set up opening and closing the MongoDB connection
We'll pass in a function called operations that includes the specific action we want to take
once the connection is established */
const withDB = async (operations, res) => {
  try {
    const client = await MongoClient.connect("mongodb://localhost:27017", {
      useNewUrlParser: true,
    });

    const db = client.db("react-linkedin");

    await operations(db);

    client.close();
  } catch (err) {
    res.status(500).json({ message: "Error connecting to db", err });
  }
};

app.get("/api/articles/:name", async (req, res) => {
  withDB(async (db) => {
    const articleName = req.params.name;

    const articleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });

    /* .json is the same as .send, but better when working with JSON */
    res.status(200).json(articleInfo);
  }, res);
});

/* This route uvotes a certain article */
app.post("/api/articles/:name/upvote", async (req, res) => {
  withDB(async (db) => {
    const articleName = req.params.name;

    const articleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });

    await db.collection("articles").updateOne(
      { name: articleName },
      {
        $set: {
          upvotes: articleInfo.upvotes + 1,
        },
      }
    );

    const updatedArticleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });

    res.status(200).json(updatedArticleInfo);
  }, res);
});

app.post("/api/articles/:name/add-comment", (req, res) => {
  const { username, text } = req.body;
  const articleName = req.params.name;

  withDB(async (db) => {
    const articleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });

    await db.collection("articles").updateOne(
      { name: articleInfo.name },
      {
        $set: {
          comments: articleInfo.comments.concat({ username, text }),
        },
      }
    );

    const updatedArticleInfo = await db
      .collection("articles")
      .findOne({ name: articleName });

    res.status(200).json(updatedArticleInfo);
  }, res);
});

/* This tells our app that all the API requests not caught by other routes should
be passed onto our app, hence index.html */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/build/index.html"));
});

/* The second argument below is a function that's called when the app
starts listening */
app.listen(8000, () => console.log("Listening on port 8000"));
