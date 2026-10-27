const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const MIN_PLAYERS = 3; // excluding host

function now(){ return Date.now(); }
function randomCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
function uniqueCode() {
  let code;
  do { code = randomCode(); } while (rooms.has(code));
  return code;
}
function token6(){ return randomCode(6); }

function publicPlayers(room){
  return Array.from(room.players.values()).map(p => ({ name: p.name, token: p.token }));
}
function roomState(code) {
  const room = rooms.get(code);
  if (!room) return null;
  return {
    code: room.code,
    started: room.started,
    hostName: room.hostName || "Host",
    playerCount: room.players.size,
    players: publicPlayers(room),
    voteOpen: !!room.voteOpen
  };
}
function voteState(room){
  const players = publicPlayers(room);
  const counts = {};
  for (const p of players) counts[p.token] = 0;
  for (const v of room.votes.values()){
    if (counts[v] !== undefined) counts[v] += 1;
  }
  return { players, counts, totalVotes: room.votes.size };
}

io.on("connection", (socket) => {

  socket.on("create_room", ({ hostName, word }, cb) => {
    hostName = String(hostName||"").trim().slice(0, 20);
    word = String(word||"").trim().slice(0, 30);
    if (!hostName || !word) return cb({ ok: false, error: "Escribe tu nombre y la palabra." });

    const code = uniqueCode();
    rooms.set(code, {
      code,
      word,
      started: false,
      hostId: socket.id,
      hostName,
      players: new Map(),
      voteOpen: false,
      votes: new Map()
    });

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.isHost = true;

    cb({ ok: true, code });
    io.to(code).emit("room_update", roomState(code));
  });

  socket.on("join_room", ({ code, name }, cb) => {
    code = String(code||"").trim().toUpperCase();
    name = String(name||"").trim().slice(0, 20);
    if (!rooms.has(code)) return cb({ ok: false, error: "Código no válido." });

    const room = rooms.get(code);
    if (room.started) return cb({ ok: false, error: "La partida ya empezó." });
    if (!name) return cb({ ok: false, error: "Escribe tu nombre." });
    if (socket.id === room.hostId) return cb({ ok:false, error:"El host no participa como jugador." });

    let t;
    do { t = token6(); } while ([...room.players.values()].some(p => p.token === t));

    room.players.set(socket.id, { name, token: t, joinedAt: now() });

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.isHost = false;

    cb({ ok: true });
    io.to(code).emit("room_update", roomState(code));
  });

  socket.on("start_game", ({ code }, cb) => {
    code = String(code||"").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok:false, error:"Sala no encontrada." });
    if (socket.id !== room.hostId) return cb?.({ ok:false, error:"Solo el host puede iniciar." });

    if (room.players.size < MIN_PLAYERS) return cb({ ok:false, error:`Mínimo ${MIN_PLAYERS} jugadores (sin contar al host).` });

    room.started = true;
    room.voteOpen = false;
    room.votes = new Map();

    const playerIds = Array.from(room.players.keys());
    const impostorId = playerIds[Math.floor(Math.random() * playerIds.length)];

    for (const [sid, p] of room.players.entries()) {
      const role = (sid === impostorId) ? "IMPOSTOR" : "CREWMATE";
      const shown = (role === "IMPOSTOR") ? "IMPOSTOR" : room.word;
      io.to(sid).emit("reveal", { code, name: p.name, role, shown });
    }

    io.to(room.hostId).emit("host_started", { code, playerCount: room.players.size });
    cb({ ok:true });
    io.to(code).emit("room_update", roomState(code));
  });

  socket.on("open_vote", ({ code }, cb) => {
    code = String(code||"").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok:false, error:"Sala no encontrada." });
    if (socket.id !== room.hostId) return cb?.({ ok:false, error:"Solo el host puede abrir la votación." });
    if (!room.started) return cb?.({ ok:false, error:"Primero inicia la partida." });

    room.voteOpen = true;
    room.votes = new Map();

    io.to(code).emit("vote_open", { code, ...voteState(room) });
    cb?.({ ok:true });
    io.to(code).emit("room_update", roomState(code));
  });

  socket.on("cast_vote", ({ code, targetToken }, cb) => {
    code = String(code||"").trim().toUpperCase();
    targetToken = String(targetToken||"").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok:false, error:"Sala no encontrada." });
    if (!room.voteOpen) return cb?.({ ok:false, error:"La votación no está abierta." });
    if (socket.id === room.hostId) return cb?.({ ok:false, error:"El host no vota." });
    if (!room.players.has(socket.id)) return cb?.({ ok:false, error:"No estás en la sala." });

    const me = room.players.get(socket.id);
    if (me.token === targetToken) return cb?.({ ok:false, error:"No puedes votarte a ti mismo." });
    if (![...room.players.values()].some(p => p.token === targetToken)) return cb?.({ ok:false, error:"Objetivo no válido." });

    room.votes.set(socket.id, targetToken);
    cb?.({ ok:true });
    io.to(code).emit("vote_update", { code, ...voteState(room) });
  });

  socket.on("close_vote", ({ code }, cb) => {
    code = String(code||"").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb?.({ ok:false, error:"Sala no encontrada." });
    if (socket.id !== room.hostId) return cb?.({ ok:false, error:"Solo el host puede cerrar." });

    room.voteOpen = false;
    io.to(code).emit("vote_closed", { code, ...voteState(room) });
    cb?.({ ok:true });
    io.to(code).emit("room_update", roomState(code));
  });

  socket.on("leave_room", ({ code }, cb) => {
    code = String(code||"").trim().toUpperCase();
    leaveInternal(socket, code);
    cb?.({ ok:true });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (code) leaveInternal(socket, code);
  });
});

function leaveInternal(socket, code){
  if (!code || !rooms.has(code)) return;
  const room = rooms.get(code);

  if (socket.id === room.hostId){
    rooms.delete(code);
    io.to(code).emit("room_closed");
    return;
  }

  room.players.delete(socket.id);
  room.votes.delete(socket.id);
  io.to(code).emit("room_update", roomState(code));

  if (room.voteOpen){
    io.to(code).emit("vote_update", { code, ...voteState(room) });
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port", PORT));
