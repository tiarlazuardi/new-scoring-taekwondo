const express = require('express');
const Pusher = require('pusher');

const app = express();
app.use(express.json());

// Inisialisasi Pusher menggunakan kunci dari dashboard kamu
const pusher = new Pusher({
  appId: "2201670",
  key: "1c192663177ea6b128ac",
  secret: "544a853bea11a2a991d2",
  cluster: "ap1",
  useTLS: true
});

// Endpoint untuk mengirim/memperbarui skor
app.post('/api/vote', async (req, res) => {
  const { team, points } = req.body;
  
  // Kirim sinyal real-time ke semua perangkat yang terhubung
  await pusher.trigger('taekwondo-channel', 'score-updated', { team, points });
  
  res.json({ success: true, message: "Skor berhasil dikirim!" });
});

// Endpoint untuk kontrol timer / reset
app.post('/api/control', async (req, res) => {
  const { action, payload } = req.body;
  
  await pusher.trigger('taekwondo-channel', 'control-action', { action, payload });
  
  res.json({ success: true, action });
});

module.exports = app;