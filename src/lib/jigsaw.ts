export const JIGSAW_LEVELS = [6, 12, 24, 48] as const;
export type JigsawLevel = (typeof JIGSAW_LEVELS)[number];

export function jigsawGrid(pieces: JigsawLevel) {
  const columns = { 6: 3, 12: 4, 24: 6, 48: 8 }[pieces];
  return { columns, rows: pieces / columns };
}

export interface JigsawState {
  token: string;
  imageIndex: number;
  pieces: JigsawLevel;
  order: number[];
  placed: number[];
  complete: boolean;
}

// Alle stukjes gebruiken dezelfde beeldcoördinaten. Daardoor sluiten zowel
// de illustratie als de gedeelde puzzelranden ook bij staande foto's aan.
export function jigsawPiecePath(piece: number, pieces: JigsawLevel, aspect: number): string {
  const { columns, rows } = jigsawGrid(pieces);
  const width = 100;
  const height = columns * width / aspect / rows;
  const column = piece % columns;
  const row = Math.floor(piece / columns);
  const x = column * width;
  const y = row * height;
  const depth = Math.min(width, height) * 0.18;
  const sign = (n: number) => n % 2 === 0 ? 1 : -1;
  let path = `M ${x} ${y}`;

  function edge(ax: number, ay: number, bx: number, by: number, tab: number) {
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    const point = (along: number, out: number) =>
      `${ax + dx * along + dy / length * out * depth * tab} ${ay + dy * along - dx / length * out * depth * tab}`;
    if (tab) {
      path += ` L ${point(0.35, 0)} C ${point(0.44, 0)} ${point(0.35, 1)} ${point(0.5, 1)}`;
      path += ` C ${point(0.65, 1)} ${point(0.56, 0)} ${point(0.65, 0)}`;
    }
    path += ` L ${bx} ${by}`;
  }

  edge(x, y, x + width, y, row === 0 ? 0 : sign(column + row));
  edge(x + width, y, x + width, y + height, column === columns - 1 ? 0 : sign(column + row));
  edge(x + width, y + height, x, y + height, row === rows - 1 ? 0 : -sign(column + row + 1));
  edge(x, y + height, x, y, column === 0 ? 0 : -sign(column + row - 1));
  return `${path} Z`;
}
