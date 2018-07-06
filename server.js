const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const moment = require('moment')
const mysql = require('mysql')
const app = express()
const webPush = require('web-push')
const env = require('./env')

const connection = mysql.createConnection({
  host: env.host,
  user: env.user,
  password: env.password,
  database: env.database
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  )
  next()
})

app.get('/', (req, res) => {
  const data = {
    title: 'SELAMAT DATANG DI INGAT SHOLAT API',
    desc:
      'API ini memberikan jadwal sholat harian kepada anda secara free sesuai dengan kota yang anda inginkan',
    howToUse: {
      url: 'https://ingat-sholat.herokuapp.com',
      method: 'POST',
      body: {
        city: 'Your City/Region Name'
      },
      headers: {
        Authorization: 'Bearer hello-prayer-app'
      }
    }
  }
  res.json(data)
})

app.post('/', (req, res) => {
  if (req.headers.authorization !== env.authorization)
    return res.status(401).json(req.headers)
  const city = req.body.city
  console.log(city)
  request.get(
    `https://muslimsalat.com/${city}.json/daily?key=1bc429a1520a1df9b6b019c6f6b92cb6`,
    function(err, response, body) {
      if (err) return res.json(err)
      res.json(JSON.parse(body))
      console.log(JSON.parse(body))
    }
  )
})

//INTERNAL PUSH NOTIF EXPERIMENT
app.post('/store', (req, res) => {
  if (req.headers.authorization !== env.notifAuthorization)
    return res.status(401).json(req.headers)
  const body = req.body
  const prayer = Object.keys(body.prayer).map(el => body.prayer[el])
  const endpoint = Object.keys(body.data).map(el => body.data[el])
  const singleEndpoint = body.data.endpoint
  connection.query(
    `DELETE FROM endpoint WHERE endpoint='${singleEndpoint}'`,
    (error, response) => {
      if (error) return res.status(400).json(error)
      connection.query(
        'INSERT INTO endpoint(p256dh,auth,endpoint,location,date,shubuh,shuruq,dzuhur,ashar,maghrib,isya) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        [...endpoint, ...prayer],
        (error2, response2) => {
          if (error2) res.status(400).json(error2)
          return res.json(response2)
        }
      )
    }
  )
})

const reset = () => {
  connection.query(`UPDATE endpoint SET updated=''`, (err, result) => {
    if (err) return console.log('error reset ', err)
    console.log('reset time')
  })
}

const testNotif = () => {
  const date = moment()
  let now = date.format('HH:mm')
  const options = {
    TTL: '60',
    gcmAPIKey: env.gcmAPIKey
  }
  connection.query('SELECT * FROM endpoint', (err, result, field) => {
    if (err) return console.log('error : ', err)
    const last = result.length - 1
    result.forEach((el, idx) => {
      const updated = el.updated
      ;['shubuh', 'shuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'].forEach(
        (sholat, idx) => {
          const temp = el[sholat].split(' ')
          let time =
            temp[1] === 'pm'
              ? moment(temp[0], 'H:mm')
                  .add(12, 'hours')
                  .format('HH:mm')
              : moment(temp[0], 'H:mm').format('HH:mm')
          const payload = {
            kota: el.location,
            sholat
          }
          if (now === time && (!updated || !updated.includes(sholat))) {
            console.log('NOTIFICATION BEGIN')
            webPush
              .sendNotification(
                {
                  endpoint: el.endpoint,
                  keys: {
                    auth: el.auth,
                    p256dh: el.p256dh
                  }
                },
                JSON.stringify(payload),
                options
              )
              .then(res => {
                console.log(res)
                connection.query(
                  `UPDATE endpoint SET updated=? WHERE endpoint=?`,
                  [updated ? updated + sholat : sholat, el.endpoint],
                  (error, res) => {
                    if (error) return console.log('error', error)
                    console.log('UPDATE', res)
                  }
                )
                console.log('NOTIFICATION END')
              })
              .catch(res => console.error(res))
          }
        }
      )
    })
  })
  if (/(?:00:00|24:00)/gi.test(now)) reset()
}
;(() => {
  connection.connect()
  setInterval(() => {
    testNotif()
    request.get('https://app-caller.herokuapp.com', function(
      err,
      response,
      body
    ) {
      if (err) return console.log(err)
      console.log(JSON.parse(body))
    })
  }, 1000 * 60)
})()

app.listen(process.env.PORT || 3000, () => {
  console.log('listening on port 3000, or whatever')
})
