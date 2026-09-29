import { randomInt, createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import manifest from "../../prisma/kidsManifest.json";
import { jigsawGrid, type JigsawLevel, type JigsawState } from "@/lib/jigsaw";

// Alleen URL's gaan naar de browser, niet de teksten uit het kinderboek.
export const jigsawImages = [...new Set(manifest.flatMap((story) => story.images))];
export const jigsawLevelSchema = z.union([z.literal(6), z.literal(12), z.literal(24), z.literal(48)]);
const stateSchema = z.object({
  imageIndex: z.number().int().min(0).max(jigsawImages.length - 1),
  pieces: jigsawLevelSchema,
  order: z.array(z.number().int().min(0).max(47)).max(48),
  placed: z.array(z.number().int().min(0).max(47)).max(48),
  exp: z.number(),
});
type SignedState = z.infer<typeof stateSchema>;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET ontbreekt of is te kort.");
  // Een puzzeltoken mag nooit als inlogtoken bruikbaar zijn.
  return createHash("sha256").update(`jigsaw:${secret}`).digest();
}

async function sign(state: SignedState, userId: string): Promise<JigsawState> {
  const token = await new SignJWT(state).setProtectedHeader({ alg: "HS256" })
    .setAudience("jigsaw").setSubject(userId).sign(key());
  return {
    token, imageIndex: state.imageIndex, pieces: state.pieces,
    order: state.order, placed: state.placed, complete: state.placed.length === state.pieces,
  };
}

export async function startJigsaw(userId: string, imageIndex: number, pieces: JigsawLevel): Promise<JigsawState> {
  const order = Array.from({ length: pieces }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return sign({ imageIndex, pieces, order, placed: [], exp: Math.floor(Date.now() / 1000) + 86400 }, userId);
}

export async function placeJigsawPiece(userId: string, token: string, piece: number, x: number, y: number) {
  let state: SignedState;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: "jigsaw", subject: userId, algorithms: ["HS256"] });
    state = stateSchema.parse(payload);
  } catch {
    return null;
  }
  const { columns, rows } = jigsawGrid(state.pieces);
  const accepted = Number.isInteger(piece) && piece >= 0 && piece < state.pieces &&
    Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1 &&
    Math.abs(x * columns - (piece % columns + 0.5)) <= 0.5 &&
    Math.abs(y * rows - (Math.floor(piece / columns) + 0.5)) <= 0.5;
  // Een herhaalde aanvraag na een netwerkfout legt het stukje maar één keer.
  if (accepted && !state.placed.includes(piece)) state.placed.push(piece);
  return { ...await sign(state, userId), accepted };
}
