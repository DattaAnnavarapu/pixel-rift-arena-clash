// npm start is production-only; npm run dev owns the Vite middleware.
process.env.NODE_ENV = "production";
const { createGameServer } = await import("./index.js");
const game = await createGameServer();
console.log(`Pixel Rift listening on ${game.url}`);

let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => process.exit(1), 10000);
    deadline.unref();
    void game.close().then(() => {
      clearTimeout(deadline);
      process.exit(0);
    });
  });
export {};
