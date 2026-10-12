const express = require('express');
const Pusher = require('pusher');

const app = express();
app.use(express.json());

// Inisialisasi Pusher
const pusher = new Pusher({
  appId: "2201670",
  key: "1c192663177ea6b128ac",
  secret: "544a853bea11a2a991d2",
  cluster: "ap1",
  useTLS: true
});

// Memori sementara untuk melacak status timer & vote dari 3 juri
let matchState = {
  timerRunning: false,
  votes: { red: {}, blue: {} }
};

// Endpoint menerima vote dari Juri
app.post('/api/vote', async (req, res) => {
  const { judgeId, team } = req.body;
  const now = Date.now();

  if (!matchState.timerRunning) {
    return res.json({ success: false, message: "Pertandingan belum dimulai!" });
  }

  // Catat vote juri beserta timestamp
  matchState.votes[team][judgeId] = now;

  // Hapus vote yang usianya sudah lebih dari 1 detik (1000 ms)
  const windowTime = 1000;
  for (let t in matchState.votes) {
    for (let j in matchState.votes[t]) {
      if (now - matchState.votes[t][j] > windowTime) {
        delete matchState.votes[t][j];
      }
    }
  }

  // Cek konsensus: Minimal 2 juri menekan warna sama dalam rentang 1 detik
  let redCount = Object.keys(matchState.votes.red).length;
  let blueCount = Object.keys(matchState.votes.blue).length;

  if (redCount >= 2) {
    matchState.votes.red = {}; // Reset setelah poin berhasil terpicu
    await pusher.trigger('taekwondo-channel', 'score-updated', { team: 'red', points: 1 });
    return res.json({ success: true, triggered: 'red' });
  }

  if (blueCount >= 2) {
    matchState.votes.blue = {}; // Reset setelah poin berhasil terpicu
    await pusher.trigger('taekwondo-channel', 'score-updated', { team: 'blue', points: 1 });
    return res.json({ success: true, triggered: 'blue' });
  }

  res.json({ success: true, message: "Vote tercatat, menunggu juri lain..." });
});

// Endpoint untuk kontrol timer (Start/Pause/Stop/Reset) dari Display
app.post('/api/control', async (req, res) => {
  const { action } = req.body;

  if (action === 'start') {
    matchState.timerRunning = true;
  } else if (action === 'pause' || action === 'stop' || action === 'reset') {
    matchState.timerRunning = false;
    matchState.votes = { red: {}, blue: {} };
  }

  // Kirim sinyal kontrol ke seluruh client
  await pusher.trigger('taekwondo-channel', 'control-action', { action });
  res.json({ success: true, action });
});

module.exports = app;
