const express=require('express');
const mongoose =require('mongoose');
const bcrypt=require('bcrypt')
const User=require('./models/User')
const multer=require('multer');
const Product=require('./models/product');
const path=require('path');
const cors=require('cors');
const jwt=require('jsonwebtoken')
const Secret_key="sk_test_51Od9AOSDADjm2ZwNBDYZ3z0s6MzL5xC95rUD80PhSGwEmKPpwrjnE7LPpO9HYscpxMM3C4mTPSUs1L4NeubRobYW00j00Jb1xn"
const stripe=require('stripe')(Secret_key);
const app=express();
app.use(express.json());
app.use(cors());



const db_url="mongodb+srv://bajpaishashwat332:VoYIIgKx2EWEYhOf@cluster0.dmgtiuj.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(db_url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(()=>{
        console.log("connected to mongodb");
    })
    .catch((err)=>{
        console.log(err)
    })

// setting up routing 
app.use(express.static('uploads'));
app.get('/',(req,res)=>{
    return res.json({
        message:"welcome to the home page!"
    })
})



// creating register route

    const admin="bajpai.shashwat.332@gmail.com";
    let cart={};
            for(let i=0;i<400;i++){
               cart[i]=0;}
    app.post('/register', async (req, res) => {
        try {
            const { username, email, password } = req.body;
            
            // Validate input
            if (!email || !password || !username) {
                return res.status(400).json({
                    message: 'Please enter all required fields.'
                });
            }
    
            // Check if user exists
            if(email===admin){
                const user = await User.create({
                    username,
                    email,
                    password, 
                    cartdata: cart,
                    role:'admin'
                });
                const token = jwt.sign({ id: user._id }, 'ecom_app');
                console.log(token);
                res.status(200).json({
                    message: 'Admin registered successfully.',
                    token,
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email
                    }
                });
            }
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    message: 'User already exists. Please login.'
                });
            }
          
            
            // Create user with plaintext password (not recommended)
           
            
            const user = await User.create({
                username,
                email,
                password, 
                cartdata: cart 
            });
    
            // Create token
            const token = jwt.sign({ id: user._id }, 'ecom_app');
            console.log(token);
            res.status(200).json({
                message: 'User registered successfully.',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        }
         catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
    });
//  Login Route

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: 'Please enter all required fields.'
            });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: 'User not found. Please register.'
            });
        }

        // Compare plaintext passwords directly (not secure)
        if (password !== user.password) {
            return res.status(400).json({
                message: 'Invalid credentials.'
            });
        }

        // Create token
        const token = jwt.sign({ id: user._id ,email:user.email}, 'ecom_app');
        console.log(token);
        res.status(200).json({
            message: 'Login successfull.',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


// creating post routes for adding products to database
// creating a middleware for uploading images


const storage=multer.diskStorage({
    destination:function(req,file,cb){  
        cb(null,'../client/public/images');
    },
    filename:function(req,file,cb){
        cb(null,file.fieldname+'-'+Date.now()+path.extname(file.originalname));
    }
})

const upload=multer({
    storage:storage
},)


app.post('/addproduct',upload.single('file'),add_product);

async function add_product(req, res) {
    const {title,price,description,discountPercentage,rating,stock,brand,category}=req.body;
    const image=req.file.filename;
    console.log(req.file);
    const data=await Product.create({title,price,description,discountPercentage,rating,stock,brand,category,image:image});
    try{
        if(data){
            return res.status(200).json({
                message:"Product Added Successfully",
                data:data
            })
        }

    }
    catch(err){
        console.log(err);
    }
}



app.get('/getproducts',get_products);

async function get_products(req,res){ 
    const data=await Product.find({});
    
    try{
        if(data){
            return res.status(200).json({
                message:"Products fetched successfully",
                data:data
            })
        }
    }
    catch(err){
        console.log(err);
    }
}  

// getting products by id

app.get('/getproducts/:id',get_product_by_id);

async function get_product_by_id(req,res){
    const {id}=req.params;
    const data=await Product.findById(id);
    try{
        if(data){
            return res.status(200).json({
                message:"Product fetched successfully",
                data:data
            })
        }
    }
    catch(err){
        console.log(err);
    }
}

// middleware to fetch user

const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(400).send({
            message: "Please authenticate using valid token"
        });
    } else {
        try {
            const data = jwt.verify(token, 'ecom_app');
            req.user = data.id;
            console.log("User from token:", req.user);
            next();
        } catch (err) {
            console.error("Token verification error:", err);
            return res.status(400).send({
                message: "Please authenticate again!"
            });
        }
    }
};


// api to store state and cart 

app.post('/addcart', fetchUser, store_cart);

async function store_cart(req, res) {
    console.log(req.body, req.user);

    let userdata = await User.findOne({
        _id: req.user
    });
    console.log(userdata);

    if (!userdata) {
        return res.status(404).send({ message: 'User not found.' });
    }

    if (!userdata.cartdata) {
        userdata.cartdata = {};
    }

    userdata.cartdata[req.body.itemid] = (userdata.cartdata[req.body.itemid] || 0) + 1;

    await User.findOneAndUpdate(
        { _id: req.user },
        { cartdata: userdata.cartdata }
    );

    res.send('Item added to cart.');
}



// remove product form the database too 

app.post('/deletecart', fetchUser, delete_cart);

async function delete_cart(req, res) {
    try {
        let userdata = await User.findOne({
            _id: req.user
        });

        // Check if userdata is defined to prevent accessing properties of null
        if (!userdata) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }

        console.log(req.body);

        // Check if cartdata is defined and the item exists
        if (userdata.cartdata && userdata.cartdata[req.body.itemid] > 0) {
            userdata.cartdata[req.body.itemid] -= 1;

            await User.findOneAndUpdate(
                { _id: req.user },
                { cartdata: userdata.cartdata }
            );

            res.send({
                message: 'Item removed !!',
                data: userdata.cartdata,
            });
        } else {
            res.status(400).send({
                message: 'Item not found in the cart.',
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({
            message: 'Internal Server Error',
        });
    }
}



// get cart items on authentication 

app.post('/getcart', fetchUser, getcart);

async function getcart(req, res) {
    try {
        let userdata = await User.findOne({ _id: req.user });
        

        if (!userdata) {
            return res.status(404).send({ message: 'User not found.' });
        }

        // Ensure cartdata is initialized to an empty object if null
        const cartdata = userdata.cartdata ;

        console.log(cartdata);
        res.json(cartdata);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
}


// creation of checkout page 
app.post('/checkout',checkout);

async function checkout(req,res){
    const {products}=req.body; 
    console.log(products);
    const line_items=products.map((item)=>{
        return{
            price_data:{
                currency:'inr',
                product_data:{
                    name:item.name,
                },
                unit_amount:item.price*100
            },
            quantity:item.quantity
        } 
    })
    console.log(line_items);
    const session=await stripe.checkout.sessions.create({
        payment_method_types:['card'],
        line_items:line_items,
        mode:'payment',
        success_url:'http://localhost:5173/success',
        cancel_url:'http://localhost:5173/cancel'
    })
    res.json({id:session.id});
}



app.listen(5000,()=>{
    console.log('server is runing on PORT 5000');
})


