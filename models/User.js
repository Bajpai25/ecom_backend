const mongoose=require('mongoose');

const UserSchema=mongoose.Schema({
    username:{
        type:String,
        required:true,
        trim:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
        type:String,
        default:'user'
    },
    date:{
        type:Date,
        default:Date.now()
    },
    cartdata:{
        type:Object
    }

},{timestamp:true}
)

module.exports=mongoose.model('User',UserSchema);