// npm start is production-only; npm run dev owns the Vite middleware.
process.env.NODE_ENV = "production";
const { createGameServer } = await import("./index.js");
const game = await createGameServer();
console.log(`Pixel Rift listening on ${game.url}`);

export {};
