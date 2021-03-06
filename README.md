# Waktu Sholat - API dan Push Notification

API yang memberikan jadwal sholat harian secara gratis sesuai dengan kota yang diinginkan dan mengirimkan push notification ketika waktu sholat telah tiba.

## Endpoint 
+ https://ingat-sholat.herokuapp.com

## API

```json
{
  "url": "https://ingat-sholat.herokuapp.com",
  "method": "POST",
  "body": {
    "city": "<Your City/Region Name>"
  }
}
```

## Push Notification
```json
{
  "url": "https://ingat-sholat.herokuapp.com/store",
  "method": "POST",
  "body": {
    "endpoint": "<push notif endpoint>",
    "auth": "<push notif auth>",
    "p256dh": "<push notif p256dh>",
    "shubuh": "<shubuh time (ex: 4:04 pm)>",
    "shuruq": "<shuruq time (ex: 5:44 pm)>",
    "dzuhur": "<dzuhur time (ex: 12:04 pm)>",
    "ashar": "<ashar time (ex: 15:04 pm)>",
    "maghrib": "<maghrib time (ex: 18:04 pm)>",
    "isya": "<isya time (ex: 19:04 pm)>",
    "date": "<date now>",
    "location": "<Your location>"
  },
  "headers": {
    "Authorization": "Bearer hello-prayer-app"
  }
}

```

### "gcm_sender_id": "1038127839342"
