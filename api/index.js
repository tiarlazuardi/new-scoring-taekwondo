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

let activeVotes = { red: {}, blue: {} };

app.post('/api/vote', async (req, res) => {
  const { judgeId, team } = req.body;
  const now = Date.now();

  activeVotes[team][judgeId] = now;

  // Bersihkan vote yang lewat dari 1 detik
  for (let t in activeVotes) {
    for (let j in activeVotes[t]) {
      if (now - activeVotes[t][j] > 1000) {
        delete activeVotes[t][j];
      }
    }
  }

  let redJudges = Object.keys(activeVotes.red);
  let blueJudges = Object.keys(activeVotes.blue);

  if (redJudges.length >= 2) {
    let judgesList = [...redJudges];
    activeVotes.red = {};
    await pusher.trigger('taekwondo-channel', 'score-updated', { team: 'red', points: 1, judges: judgesList });
    return res.json({ success: true, triggered: 'red' });
  }

  if (blueJudges.length >= 2) {
    let judgesList = [...blueJudges];
    activeVotes.blue = {};
    await pusher.trigger('taekwondo-channel', 'score-updated', { team: 'blue', points: 1, judges: judgesList });
    return res.json({ success: true, triggered: 'blue' });
  }

  res.json({ success: true });
});

app.post('/api/control', async (req, res) => {
  const { action } = req.body;
  await pusher.trigger('taekwondo-channel', 'control-action', { action });
  res.json({ success: true, action });
});

module.exports = app;
