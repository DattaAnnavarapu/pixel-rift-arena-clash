import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRoomCode, validRoomCode } from "../src/room-entry.js";
import { matchReward, teamContributions } from "../src/match-recap.js";
import { emptyProgress, updateProgress } from "../src/progress.js";
import { resetInput, input, touch } from "../src/runtime.js";
import {
  configure,
  modes,
  player,
  start,
  snapshot,
  tick,
  type Room,
} from "../server/game.js";
import { updateMatchmaking, PROTOCOL_VERSION } from "../server/release.js";
import { createGameServer } from "../server/index.js";
import { io, type Socket } from "socket.io-client";
function room(): Room {
  return {
    code: "ABC123",
    host: "a",
    players: [player("a", "A", 0), player("b", "B", 1)],
    phase: "lobby",
    mode: "ctf",
    arena: "citadel",
    scores: [0, 0],
    end: 0,
    winner: "",
    bolts: [],
    crystals: [],
    nextCrystal: 0,
    updated: 0,
  };
}
test("room code entry accepts pasted whitespace/lowercase and rejects invalid codes", () => {
  assert.equal(normalizeRoomCode(" ab c123 \n"), "ABC123");
  assert.ok(validRoomCode(normalizeRoomCode(" abc123 ")));
  for (const code of ["", "ABC12", "ABCDEFG", "ZZZ123", "ABC1234"])
    assert.equal(validRoomCode(code), false);
});
test("reset input clears aim ownership as well as movement and held abilities", () => {
  touch.aim = touch.move = touch.firing = touch.dash = true;
  input.x = 1;
  input.fire = true;
  resetInput();
  assert.equal(touch.aim, false);
  assert.equal(touch.firing, false);
  assert.equal(touch.move, false);
  assert.equal(input.x, 0);
  assert.equal(input.fire, false);
});
test("CTF remains on its base map when host requests incompatible arena; other modes remain configurable", () => {
  const r = room();
  configure(r, "a", { arena: "ember" });
  assert.equal(r.arena, "citadel");
  configure(r, "a", { mode: "blitz", arena: "frost" });
  assert.equal(r.arena, "frost");
  configure(r, "a", { mode: "ctf", arena: "ember" });
  assert.equal(r.arena, "citadel");
  configure(r, "b", { mode: "blitz" });
  assert.equal(r.mode, "ctf");
});
test("finished public matches require opt-in readiness, cancel countdown, then rematch with new scores", () => {
  const r = room();
  r.publicMatch = true;
  start(r, 100);
  r.phase = "finished";
  r.winner = "Crimson";
  r.scores = [3, 1];
  updateMatchmaking(r, 1000);
  assert.equal(r.startsAt, undefined);
  r.players.forEach((p) => (p.ready = true));
  updateMatchmaking(r, 2000);
  assert.equal(r.startsAt, 7000);
  r.players[1].ready = false;
  updateMatchmaking(r, 3000);
  assert.equal(r.startsAt, undefined);
  r.players[1].ready = true;
  updateMatchmaking(r, 4000);
  updateMatchmaking(r, 9000);
  assert.equal(r.phase, "playing");
  assert.deepEqual(r.scores, [0, 0]);
  assert.equal(r.winner, "");
  assert.equal(r.startsAt, undefined);
});
test("private finished matches never auto-start", () => {
  const r = room();
  r.phase = "finished";
  r.players.forEach((p) => (p.ready = true));
  updateMatchmaking(r, 10000);
  assert.equal(r.phase, "finished");
  assert.equal(r.startsAt, undefined);
});
test("recap XP matches persisted progression, caps contributions and does not double reward", () => {
  const r = room();
  start(r, 0);
  r.phase = "finished";
  r.winner = "Crimson";
  r.players[0].kills = 3;
  r.players[0].objectives = 30;
  const s = snapshot(r, 1000);
  assert.deepEqual(matchReward(s, "a"), {
    completion: 100,
    win: 50,
    contribution: 100,
    total: 250,
  });
  const next = updateProgress(emptyProgress(), s, "a");
  assert.equal(next.xp, 250);
  assert.equal(updateProgress(next, s, "a").xp, 250);
  assert.equal(matchReward(s, "spectator").total, 0);
  r.finishReason = "forfeit";
  assert.equal(matchReward(snapshot(r, 2000), "a").total, 0);
  r.finishReason = undefined;
  r.tutorial = true;
  assert.equal(matchReward(snapshot(r, 2000), "a").total, 0);
});
test("team recap totals count actual contributions including healing and objectives", () => {
  const r = room();
  r.players.push(player("c", "C", 0));
  r.players[0].damageDealt = 80;
  r.players[2].damageDealt = 20;
  r.players[2].healingDone = 30;
  r.players[0].objectives = 3;
  r.players[1].damageDealt = 900;
  assert.deepEqual(teamContributions(snapshot(r, 0), 0), {
    damage: 100,
    healing: 30,
    objectives: 3,
  });
});
test("practice starts all five chosen modes privately; tutorial retains its authored rules", async () => {
  const server = await createGameServer({ port: 0, serveClient: false });
  const clients: Socket[] = [];
  try {
    for (const mode of Object.keys(modes)) {
      const s = io(server.url!, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
      });
      clients.push(s);
      await new Promise<void>((resolve, reject) => {
        s.once("connect", resolve);
        s.once("connect_error", reject);
      });
      const reply = await new Promise<any>((resolve, reject) =>
        s
          .timeout(3000)
          .emit(
            "enter",
            { protocol: PROTOCOL_VERSION, create: true, practice: true, mode },
            (error: any, result: any) =>
              error ? reject(error) : resolve(result),
          ),
      );
      const r = server.rooms.get(reply.code)!;
      assert.ok(r);
      assert.equal(r.mode, mode);
      assert.equal(r.phase, "playing");
      assert.equal(r.publicMatch, false);
      assert.equal(r.players.length, 4);
      if (mode === "ctf") {
        assert.equal(r.arena, "citadel");
        assert.equal(r.flags?.length, 2);
      }
      await new Promise<void>((resolve) => s.emit("leave", () => resolve()));
    }
    const s = clients[0];
    const reply = await new Promise<any>((resolve, reject) =>
      s.timeout(3000).emit(
        "enter",
        {
          protocol: PROTOCOL_VERSION,
          create: true,
          tutorial: true,
          mode: "ctf",
        },
        (error: any, result: any) => (error ? reject(error) : resolve(result)),
      ),
    );
    assert.equal(server.rooms.get(reply.code)?.mode, "crystal");
    assert.equal(server.rooms.get(reply.code)?.arena, "astral");
  } finally {
    clients.forEach((s) => s.disconnect());
    await server.close();
  }
});

test("changing teams for a rematch does not rewrite a completed match reward", () => {
  const r = room();
  start(r, 0);
  r.scores = [3, 0];
  tick(r, 1000, 0.01);
  assert.equal(r.phase, "finished");
  assert.equal(r.players[0].resultTeam, 0);
  assert.equal(r.players[1].resultTeam, 1);
  r.players[0].team = 1;
  r.players[1].team = 0;
  const s = snapshot(r, 1000);
  assert.equal(matchReward(s, "a").win, 50);
  assert.equal(matchReward(s, "b").win, 0);
  assert.equal(updateProgress(emptyProgress(), s, "b").wins, 0);
  start(r, 2000);
  assert.equal(r.players[0].resultTeam, undefined);
});
