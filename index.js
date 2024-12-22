const path = require("path");
const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const fs = require("fs");
const connectToMongoDB = require("./db/connectToMongo");
const FileMetadata = require("./model/uploadSchema");
// const upload = multer({ dest: './uploads' })

dotenv.config();

const app = express();
const PORT = 8000;

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.urlencoded({ extended: false }));

connectToMongoDB();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Unsupported file type. Only JPEG, PNG, and PDF are allowed."),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

app.get("/", (req, res) => {
  return res.render("homepage", {
    deleteMessage:null,
    downloadMessage:null,
    message: null,
    file: null,
  });
});
app.post("/upload", (req, res, next) => {
    upload.single("file")(req, res, function (err) {
      if (err) {
        // if (err instanceof multer.MulterError) {
        //   console.error("Multer error:", err.message);
        //   return res.status(400).render("homepage", {
        //     message: { type: "error", text: `Multer error: ${err.message}` },
        //     file: null,
        //   });
        // }
        if (err) {
          console.error("File upload error:", err.message);
          return res.status(400).render("homepage", {
            message: { type: "error", text: err.message },
            downloadMessage:null,
            deleteMessage:null,
            file: null,
          });
        }
      }
  
      if (!req.file) {
        return res.status(400).render("homepage", {
          message: { type: "error", text: "No file uploaded." },
          downloadMessage:null,
          deleteMessage:null,
          file: null,
        });
      }
      const { originalname, size, mimetype, filename } = req.file;
  
      const fileMetadata = new FileMetadata({
        originalname:originalname,
        filename: filename,
        size: size,
        mimetype: mimetype,
        uploadTimestamp: new Date(),
        uploader: req.user?.id || "Anonymous",
      });
  
      fileMetadata
        .save()
        .then(() => {
          res.status(201).render("homepage", {
            message: { type: "success", text: "File uploaded successfully!" },
            downloadMessage:null,
            deleteMessage:null,
            file: fileMetadata,
          });
        })
        .catch((saveError) => {
          console.error("Error saving file metadata:", saveError.message);
          res.status(500).render("homepage", {
            message: { type: "error", text: "Failed to save file metadata." },
            downloadMessage:null,
            deleteMessage:null,
            file: null,
          });
        });
    });
  });
  app.get("/download", async (req, res) => {
    try {
      const { originalname } = req.query;
  
    
      const fileMetadata = await FileMetadata.findOne({ originalname });
  
      if (!fileMetadata) {
        // return res.status(404).json({ message: "File not found" });
        return res.status(404).render("homepage", {
            message: null,
            deleteMessage:null,
            downloadMessage: { type: "error", text: "File not found" },
            file: null,
          })
      }
  
      
      const filePath = path.join(__dirname, "uploads", fileMetadata.filename);
  
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).render("homepage", {
            message: null,
            deleteMessage:null,
            downloadMessage: { type: "error", text: "File not found on the server" },
            file: null,
          })
      }
  
      res.setHeader("Content-Disposition", `attachment; filename=${fileMetadata.originalname}`);
      res.setHeader("Content-Type", fileMetadata.mimetype);
      res.setHeader("Content-Length", fileMetadata.size);
  
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          res.status(500).json({ message: "Error sending file" });
        }
      });
    } catch (error) {
      console.error("Error in download API:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.get("/delete", async (req, res) => {
    const { originalname } = req.query;
  
    if (!originalname) {
      return res.status(400).json({ message: "Filename is required" });
    }
  
    try {
      const fileMetadata = await FileMetadata.findOne({ originalname });
  
      if (!fileMetadata) {
        return res.status(404).render("homepage", {
            message: null,
            deleteMessage: { type: "error", text: "File not found in database" },
            downloadMessage: null,
            file: null,
          })
      }
  
      const filePath = path.join(__dirname, "uploads",fileMetadata.filename );
  
    
      if (!fs.existsSync(filePath)) {
        return res.status(404).render("homepage", {
            message: null,
            deleteMessage: { type: "error", text: "File not found on the server." },
            downloadMessage: null,
            file: null,
          })
      }
  
      
      fs.unlinkSync(filePath);
  
      
      await FileMetadata.deleteOne({ originalname });
  
      res.status(200).render("homepage", {
        message:null,
        deleteMessage: { type: "success", text: "File deleted successfully." },
        downloadMessage: null,
        file: null,
      });
    } catch (error) {
      console.error("Error in delete API:", error);
      res.status(500).json({ deleteMessage: "Internal server error" });
    }
  });





app.listen(PORT, () => {
  console.log("Server running at Port:8000");
});
