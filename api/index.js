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

// Menyimpan vote sementara di memori server
let activeVotes = { red: {}, blue: {} };

app.post('/api/vote', async (req, res) => {
  const { judgeId, team } = req.body;
  const now = Date.now();

  // Catat vote juri
  activeVotes[team][judgeId] = now;

  // Hapus vote yang lebih dari 1 detik
  for (let t in activeVotes) {
    for (let j in activeVotes[t]) {
      if (now - activeVotes[t][j] > 1000) {
        delete activeVotes[t][j];
      }
    }
  }

  // Cek konsensus (minimal 2 juri menekan tombol yang sama dalam 1 detik)
  let redCount = Object.keys(activeVotes.red).length;
  let blueCount = Object.keys(activeVotes.blue).length;

  if (redCount >= 2) {
    activeVotes.red = {};
    await pusher.trigger('taekwondo-channel', 'score-updated', { team: 'red', points: 1 });
    return res.json({ success: true, triggered: 'red' });
  }

  if (blueCount >= 2) {
    activeVotes.blue = {};
    await pusher.trigger('taekwondo-channel', 'score-updated', { team: 'blue', points: 1 });
    return res.json({ success: true, triggered: 'blue' });
  }

  res.json({ success: true, message: "Vote dicatat" });
});

app.post('/api/control', async (req, res) => {
  const { action } = req.body;
  await pusher.trigger('taekwondo-channel', 'control-action', { action });
  res.json({ success: true, action });
});

module.exports = app;
