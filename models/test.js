const mongoose= require('mongoose');

const testSchema=mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    price:{
        type:Number,
        required:true,
    },
    image:{
        type:String,
        required:true
    }
    }
)

const Test=mongoose.model('Test',testSchema);

module.exports=Test;