const express = require('express');
const Pusher = require('pusher');

const app = express();
app.use(express.json());

const pusher = new Pusher({
  appId: "2201670",
  key: "1c192663177ea6b128ac",
  secret: "544a853bea11a2a991d2",
  cluster: "ap1",
  useTLS: true
});

let matchState = {
  timerRunning: false,
  votes: { red: {}, blue: {} }
};

app.post('/api/vote', async (req, res) => {
  const { judgeId, team } = req.body;
  const now = Date.now();

  if (!matchState.timerRunning) {
    return res.json({ success: false, message: "Pertandingan belum dimulai!" });
  }

  // Catat atau perbarui waktu vote dari judgeId ini
  matchState.votes[team][judgeId] = now;

  // Bersihkan vote yang usianya sudah lebih dari 1 detik (1000 ms)
  for (let t in matchState.votes) {
    for (let j in matchState.votes[t]) {
      if (now - matchState.votes[t][j] > 1000) {
        delete matchState.votes[t][j];
      }
    }
  }

  let redCount = Object.keys(matchState.votes.red).length;
  let blueCount = Object.keys(matchState.votes.blue).length;

  // Jika minimal 2 juri menekan merah dalam 1 detik
  if (redCount >= 2) {
    // Kosongkan agar juri bisa menekan lagi untuk poin berikutnya
    matchState.votes.red = {};
    await pusher.trigger('taekwondo-channel', 'score-updated', { team: 'red', points: 1 });
    return res.json({ success: true, triggered: 'red' });
  }

  // Jika minimal 2 juri menekan biru dalam 1 detik
  if (blueCount >= 2) {
    // Kosongkan agar juri bisa menekan lagi untuk poin berikutnya
    matchState.votes.blue = {};
    await pusher.trigger('taekwondo-channel', 'score-updated', { team: 'blue', points: 1 });
    return res.json({ success: true, triggered: 'blue' });
  }

  res.json({ success: true, message: "Vote tercatat, menunggu juri lain..." });
});

app.post('/api/control', async (req, res) => {
  const { action } = req.body;
  if (action === 'start') {
    matchState.timerRunning = true;
  } else if (action === 'pause' || action === 'stop' || action === 'reset') {
    matchState.timerRunning = false;
    matchState.votes = { red: {}, blue: {} };
  }

  await pusher.trigger('taekwondo-channel', 'control-action', { action });
  res.json({ success: true, action });
});

module.exports = app;
