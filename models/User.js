const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email:{
        type: String,
        required: false,
        unique:false
    },
    password: {
        type: String,
        required: true
    },
    phone:{
        type: String,
        required: true
    },
    role:{
        type: String,
        default: "client",
        enum: ["client", "engineer","admin"]
    },
},{timestamps: true}
);

module.exports = mongoose.model("newUser", userSchema);