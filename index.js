
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5va2jyw.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


//  my middleware  set
const logger = async (req, res, next) => {
    console.log('called:', req.host, req.originalUrl)
    next()
}

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('value of token in middleware', token)
    if (!token) {
        return res.status(401).send({ message: 'not authorized' })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log('hay hay ki hlo',err);
            return res.status(401).send({ message: 'unauthorizedJs' })
        }
        console.log('value in the token', decoded)
        req.user = decoded;
        next()
    })
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // server to client connect
        const servicesCollection = client.db('carDoctor').collection('services');
        // book information server site add kora
        const bookingCollection = client.db('carDoctor').collection('booking');

        // auth  jsonWebToken
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', 
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',

            })
                .send({ success: true })

            // old 
            // res.send(user)
        })


        //  services related api
        app.get('/services', logger, async (req, res) => {
            const cursor = servicesCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })
        // details/ Check Out page
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            // je ghulo us / dekhaite cai kom data dekhate option us kora hoi 
            const options = {
                projection: { title: 1, price: 1, services_id: 1, img: 1 },
            };

            const result = await servicesCollection.findOne(query, options);
            res.send(result)
        })


        // sum data read
        app.get('/bookings', logger, verifyToken, async (req, res) => {
            console.log(req.query.email)
            // console.log('tok tok token come in', req.cookies.token)
            console.log('user in the valid token', req.user)
            if(req?.user?.email !== req?.query?.email){
                return res.status(403).send({message: 'forbidden access'})
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray();
            return res.send(result)
        })



        // book information POST
        app.post('/bookings', logger, async (req, res) => {
            const booking = req.body;
            console.log(booking)
            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        })

        // update put or patch
        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateBooking = req.body;
            console.log(updateBooking)
            const updateDoc = {
                $set: {
                    status: updateBooking.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



//  running root
app.get('/', (req, res) => {
    res.send('doctor is running')
})

app.listen(port, () => {
    console.log(`Car Doctor Server is Running Port ${port}`)
})