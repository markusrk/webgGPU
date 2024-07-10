import { add, Point, sub } from "../geometryTools";

type Triangle = [Point, Point, Point];

const wallTrianglesFromPoints = (p1: Point, p2: Point): [Triangle, Triangle] => {
  const c1 = [p1[0], p1[1], p2[2]] as Point;
  const c2 = [p2[0], p2[1], p1[2]] as Point;
  return [
    [p1, c2, p2],
    [p1, p2, c1],
  ];
};

const roofTrianglesFromPoints = (p1: Point, p2: Point): Triangle[] => {
    const c1 = [p2[0], p1[1], p2[2]] as Point;
    const c2 = [p1[0], p2[1], p2[2]] as Point;
    return [[p1, c2,p2], [p1, p2,c1]];
    
}

export const inwardsBoxFromAABB = (p1: Point, p2: Point): Triangle[] => {
  const x = [p2[0] - p1[0], 0, 0] as Point;
  const y = [0, p2[1] - p1[1], 0] as Point;
  const z = [0, 0, p2[2] - p1[2]] as Point;

  const front = wallTrianglesFromPoints(add(p1, x), add(p1, z));
  const right = wallTrianglesFromPoints(sub(p2,z), sub(p2, y));
  const back = wallTrianglesFromPoints(add(p1, y), p2);
  const left = wallTrianglesFromPoints(p1, add(add(p1, z),y))
  const top = roofTrianglesFromPoints( add(p1, z),p2);

  return [...front, ...right, ...back, ...left, ...top];
};

export const boxFromAABB = (p1: Point, p2: Point): Triangle[] => {
  const x = [p2[0] - p1[0], 0, 0] as Point;
  const y = [0, p2[1] - p1[1], 0] as Point;
  const z = [0, 0, p2[2] - p1[2]] as Point;

  const front = wallTrianglesFromPoints(p1, add(add(p1, x), z));
  const right = wallTrianglesFromPoints(add(p1, x), p2);
  const back = wallTrianglesFromPoints(sub(p2, z), sub(p2, x));
  const left = wallTrianglesFromPoints(add(p1, y), add(p1, z));

  return [...front, ...right, ...back, ...left];
};
