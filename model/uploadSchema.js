const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalname: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
    uploadTimestamp: { type: Date, default: Date.now },
    uploader: { type: String, required: false },
});

const FileMetadata = mongoose.model("File", fileSchema);

module.exports = FileMetadata;
