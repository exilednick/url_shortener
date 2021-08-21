import express from 'express'
import redis from 'async-redis'
import exphbs from 'express-handlebars'

const client = redis.createClient()

client.on('connect', () => {console.log('Redis server ready')})

const app = express()
app.use(express.urlencoded({extended:false}))
app.use(express.json())
app.engine('handlebars', exphbs({
    defaultLayout: false
}))
app.set('view engine', 'handlebars')

const makeid = async(length) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

app.post('/short', async(req, res) => {
    console.log(req.body)
    const newUrl = await makeid(8) //generate new url
    const isPresent = await client.get(newUrl) //check collision for random id
    const isUrlPresent = await client.get(req.body.url) //check if url already generated

    if(isUrlPresent) {
        return res.status(200).json({
            url: `http://localhost:5000/s/${isUrlPresent}`
        })
    }
    if (!isPresent) {
        await client.set(newUrl, req.body.url)
        await client.set(req.body.url, newUrl)
        return res.status(200).json({
            url: `http://localhost:5000/s/${newUrl}`
        })
    }
})

app.get('/', (req, res) => {
    res.render('home')
})

app.get('/s/:id', async(req, res) => {
    const oldUrl = await client.get(req.params.id)

    if(!oldUrl) {
        return res.status(500)
    }


    return res.redirect(oldUrl)
})

app.listen(5000, () => {console.log('Server started')})
