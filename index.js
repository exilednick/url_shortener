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

const checkUrl = async(url) => {
    const expression = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
    const regex = new RegExp(expression);
    if(url.match(regex)) {
        return true
    } else {
        return false
    }
}

app.post('/short', async(req, res) => {
    const isValid = await checkUrl(req.body.url)
    if(!isValid) {
        return res.status(500).send("Incorrect input")
    }

    const newUrl = await makeid(8) //generate new url
    const isPresent = await client.get(newUrl) //check collision for random id
    const isUrlPresent = await client.get(req.body.url) //check if url already generated

    if(isUrlPresent) {
        await client.set(req.body.url, isUrlPresent, 'EX', 3600) // reset timer
        await client.set(isUrlPresent, req.body.url, 'EX', 3600)
        return res.render('url', {url: `http://localhost:5000/s/${isUrlPresent}`})
    }
    if (!isPresent) {
        await client.set(newUrl, req.body.url, 'EX', 3600)    
        await client.set(req.body.url, newUrl, 'EX', 3600)

        return res.render('url', {url: `http://localhost:5000/s/${newUrl}`})
    }
})

app.get('/', (req, res) => {
    res.render('home')
})

app.get('/s/:id', async(req, res) => {
    const oldUrl = await client.get(req.params.id)

    if(!oldUrl) {
        return res.send('Your link has expired')
    }

    return res.redirect(oldUrl)
})

app.listen(5000, () => {console.log('Server started')})
