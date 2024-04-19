const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    author: {
        type: String,
        required: true
    },
    title:{
        type: String,
        required: false,
        unique:false
    },
    desc: {
        type: String,
        required: true
    },
    AssignTo:{
        type: String,
        default:"anyone"
    },
    status:{
        type:String,
        default:"Pending"
    },
    type:{
        type: String,
        enum:["CMReport","PMReport","PPMReport","regular"]
    }
},{timestamps: true}
);

module.exports = mongoose.model("newreport", reportSchema);