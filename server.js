const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const moment = require('moment')
const pg = require('pg')
const app = express()
const webPush = require('web-push')
const env = require('./env')

// MYSQL CONNECTION
// const connection = mysql.createConnection({
//   host: env.host,
//   user: env.user,
//   password: env.password,
//   database: env.database
// })

// PSQL CONNECTION
const { Client } = pg
const client = new Client({
  host: env.host,
  database: env.database,
  user: env.user,
  password: env.password
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use(function (req, res, next) {
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
      'API ini memberikan jadwal sholat harian kepada anda secara gratis sesuai dengan kota yang anda inginkan',
    API: {
      url: 'https://ingat-sholat.herokuapp.com',
      method: 'POST',
      body: {
        city: 'Your City/Region Name'
      }
    },
    PushNotif: {
      url: 'https://ingat-sholat.herokuapp.com/store',
      method: 'POST',
      body: {
        endpoint: 'push notif endpoint',
        auth: 'push notif auth',
        p256dh: 'push notif p256dh',
        shubuh: 'shubuh time (ex: 4:04 pm)',
        shuruq: 'shuruq time (ex: 5:44 pm)',
        dzuhur: 'dzuhur time (ex: 12:04 pm)',
        ashar: 'ashar time (ex: 15:04 pm)',
        maghrib: 'maghrib time (ex: 18:04 pm)',
        isya: 'isya time (ex: 19:04 pm)',
        date: 'date now',
        location: 'Your location'
      },
      headers: {
        Authorization: 'Bearer hello-prayer-app'
      }
    }
  }
  res.json(data)
})

app.post('/', (req, res) => {
  // if (req.headers.authorization !== env.authorization)
  //   return res.status(401).json(req.headers)
  const city = req.body.city
  console.log(city)
  request.get(env.endpoint(city), function (err, response, body) {
    if (err) return res.json(err)
    res.json(JSON.parse(body))
    console.log(JSON.parse(body))
  })
})

//PUSH NOTIF SUPPORT
app.post('/store', async (req, res) => {
  if (req.headers.authorization !== env.authorization)
    return res.status(401).json({ data: 'Not Authorized' })
  const body = req.body
  body.updated = null

  // MYSQL Query
  // connection.query(
  //   `DELETE FROM endpoint WHERE endpoint='${singleEndpoint}'`,
  //   (error, response) => {
  //     if (error) return res.status(400).json(error)
  //     connection.query(
  //       'INSERT INTO endpoint(p256dh,auth,endpoint,location,date,shubuh,shuruq,dzuhur,ashar,maghrib,isya) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
  //       [...endpoint, ...prayer],
  //       (error2, response2) => {
  //         if (error2) res.status(400).json(error2)
  //         return res.json(response2)
  //       }
  //     )
  //   }
  // )

  // PSQL Query
  try {
    await client.query(`DELETE FROM endpoint WHERE endpoint='${body.endpoint}'`)
    // endpoint, auth, p256dh, shubuh, shuruq, dzuhur, ashar , maghrib , isya, date, updated
    const query = await client.query(
      'INSERT INTO endpoint VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [
        body.endpoint,
        body.auth,
        body.p256dh,
        body.shubuh,
        body.shuruq,
        body.dzuhur,
        body.ashar,
        body.maghrib,
        body.isya,
        body.date,
        body.updated,
        body.location
      ]
    )
    console.log('INSERT SUCCESS\n', query)
    res.json({ is_ok: true })
  } catch (err) {
    console.log(err.stack)
    res.json({ is_ok: false, error: err })
  }
})

const reset = async () => {
  // MYSQL
  // connection.query(`UPDATE endpoint SET updated=''`, (err, result) => {
  //   if (err) return console.log('error reset ', err)
  //   console.log('reset time')
  // })

  // PSQL
  await client.query(`UPDATE endpoint SET updated=''`)
  console.log('RESET')
}

// MYSQL
// const startNotification = () => {
//   const date = moment()
//   let now = date.format('HH:mm')
//   const options = {
//     TTL: '60',
//     gcmAPIKey: env.gcmAPIKey
//   }
//   connection.query('SELECT * FROM endpoint', (err, result, field) => {
//     if (err) return console.log('error : ', err)
//     const last = result.length - 1
//     result.forEach((el, idx) => {
//       const updated = el.updated
//       ;['shubuh', 'shuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'].forEach(
//         (sholat, idx) => {
//           const temp = el[sholat].split(' ')
//           let time =
//             temp[1] === 'pm'
//               ? moment(temp[0], 'H:mm')
//                   .add(12, 'hours')
//                   .format('HH:mm')
//               : moment(temp[0], 'H:mm').format('HH:mm')
//           const payload = {
//             kota: el.location,
//             sholat
//           }
//           if (now === time && (!updated || !updated.includes(sholat))) {
//             console.log('NOTIFICATION BEGIN')
//             webPush
//               .sendNotification(
//                 {
//                   endpoint: el.endpoint,
//                   keys: {
//                     auth: el.auth,
//                     p256dh: el.p256dh
//                   }
//                 },
//                 JSON.stringify(payload),
//                 options
//               )
//               .then(res => {
//                 console.log(res)
//                 connection.query(
//                   `UPDATE endpoint SET updated=? WHERE endpoint=?`,
//                   [updated ? updated + sholat : sholat, el.endpoint],
//                   (error, res) => {
//                     if (error) return console.log('error', error)
//                     console.log('UPDATE', res)
//                   }
//                 )
//                 console.log('NOTIFICATION END')
//               })
//               .catch(res => console.error(res))
//           }
//         }
//       )
//     })
//   })
//   if (/(?:00:00|24:00)/gi.test(now)) reset()
// }

// PSQL
const startNotification = async () => {
  const date = moment()
  let now = date.format('HH:mm')
  console.log('checking on time : ', now)
  const options = {
    TTL: '60',
    gcmAPIKey: env.gcmAPIKey
  }
  try {
    const { rows } = await client.query('SELECT * FROM endpoint')
    const last = rows.length - 1
    rows.forEach((el, idx) => {
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
                .then(async res => {
                  console.log(res)
                  await client.query(
                    `UPDATE endpoint SET updated=$1 WHERE endpoint=$2`,
                    [updated + sholat, el.endpoint],
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
  } catch (err) {
    console.log(err)
  }
  if (/(?:6:01|24:00)/gi.test(now)) reset()
}
  ; (() => {
    client.connect()
    setInterval(() => {
      try {
        startNotification()
        request.get('https://app-caller.herokuapp.com', function (
          err,
          response,
          body
        ) {
          if (err) return console.log(err)
          console.log(JSON.parse(body))
        })
      } catch (err) {
        console.log('ERROR : ', err)
      }
    }, 1000 * 60)
  })()

app.listen(process.env.PORT || 3000, async () => {
  console.log('listening on port 3000, or whatever')
})
