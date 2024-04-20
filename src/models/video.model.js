import mongoose, { Schema } from mongoose;

const videoSchema = new Schema({
    videoFile: {
        type: String,
        unique: true,
        required: true,
    },
    thumbnail: {
        type: String,
        unique: true,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    title: {
        type: String,
        required: true,
        maxlength: 150,
        minlength: 30,
    },
    description: {
        type: String,
        required: true,
        maxlength: 60,
        minlength: 300,
    },
    duration: {
        type: Number, //cloudinary url
        required: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    isPublished: {
        type: Boolean,
        default: false,
    }

}, { timestamps: true })
export const Video = mongoose.model("Video", videoSchema);