import { add, Point, scalarMul, sub } from "../geometryTools";

type Triangle = [Point, Point, Point];

const wallTrianglesFromPoints = (p1: Point, p2: Point): [Triangle, Triangle] => {
  const c1 = [p1[0], p1[1], p2[2]] as Point;
  const c2 = [p2[0], p2[1], p1[2]] as Point;
  return [
    [p1, c2, p2],
    [p1, p2, c1],
  ];
};

const wallWithWindowFromPoints = (p1: Point, p2: Point, wp1: Point, wp2: point): Triangle[] => {
  const wallSection1EndPoint = [wp1[0], wp1[1], p2[2]] as Point;
  const wallSection1 = wallTrianglesFromPoints(p1, wallSection1EndPoint);

  const wallUnderWindowStartPoint = [wp1[0], wp1[1], p1[2]] as Point;
  const wallUnderWindowEndPoint = [wp2[0], wp2[1], wp1[2]] as Point;
  const wallSectionUnderWindow = wallTrianglesFromPoints(wallUnderWindowStartPoint, wallUnderWindowEndPoint);

  const wallOverWindowStartPoint = [wp1[0], wp1[1], wp2[2]] as Point;
  const wallOverWindowEndPoint = [wp2[0], wp2[1], p2[2]] as Point;
  const wallSectionOverWindow = wallTrianglesFromPoints(wallOverWindowStartPoint, wallOverWindowEndPoint);

  const wallSection2StartPoint = [wp2[0], wp2[1], p1[2]] as Point;
  const wallSection2 = wallTrianglesFromPoints(wallSection2StartPoint, p2);

  return [...wallSection1, ...wallSectionUnderWindow, ...wallSectionOverWindow, ...wallSection2];
};

const downwardsFacingTrianglesFromPoints = (p1: Point, p2: Point): Triangle[] => {
  const c1 = [p2[0], p1[1], p2[2]] as Point;
  const c2 = [p1[0], p2[1], p2[2]] as Point;
  return [
    [p1, c2, p2],
    [p1, p2, c1],
  ];
};

export const inwardsBoxFromAABBWithwindow = (p1: Point, p2: Point): Triangle[] => {
  const x = [p2[0] - p1[0], 0, 0] as Point;
  const y = [0, p2[1] - p1[1], 0] as Point;
  const z = [0, 0, p2[2] - p1[2]] as Point;

  const front = wallTrianglesFromPoints(add(p1, x), add(p1, z));
  const right = wallTrianglesFromPoints(sub(p2, z), sub(p2, y));

  const wp1 = add(add(add(p1, y), scalarMul(x, 0.4)), scalarMul(z, 0.0));
  const wp2 = add(add(add(p1, y),scalarMul(z,0.80)), scalarMul(x, 0.6));
  const back = wallWithWindowFromPoints(add(p1, y), p2, wp1, wp2);
  const left = wallTrianglesFromPoints(p1, add(add(p1, z), y));
  const top = downwardsFacingTrianglesFromPoints(add(p1, z), p2);

  return [...front, ...right, ...back, ...left, ...top];
};
export const inwardsBoxFromAABBWithHoleInTheTop = (p1: Point, p2: Point): Triangle[] => {
  const x = [p2[0] - p1[0], 0, 0] as Point;
  const y = [0, p2[1] - p1[1], 0] as Point;
  const z = [0, 0, p2[2] - p1[2]] as Point;

  const front = wallTrianglesFromPoints(add(p1, x), add(p1, z));
  const right = wallTrianglesFromPoints(sub(p2, z), sub(p2, y));
  const back = wallTrianglesFromPoints(add(p1, y), p2);
  const left = wallTrianglesFromPoints(p1, add(add(p1, z), y));
  const top = downwardsFacingTrianglesFromPoints(add(p1, z), p2);

  return [...front, ...right, ...back, ...left];
};

// This code is not tested. Please don't use.
export const boxFromAABBWithHoleInTheTop = (p1: Point, p2: Point): Triangle[] => {
  const x = [p2[0] - p1[0], 0, 0] as Point;
  const y = [0, p2[1] - p1[1], 0] as Point;
  const z = [0, 0, p2[2] - p1[2]] as Point;

  const front = wallTrianglesFromPoints(p1, add(add(p1, x), z));
  const right = wallTrianglesFromPoints(add(p1, x), p2);
  const back = wallTrianglesFromPoints(sub(p2, z), sub(p2, x));
  const left = wallTrianglesFromPoints(add(p1, y), add(p1, z));
  const bottom = downwardsFacingTrianglesFromPoints(p1, sub(p2, z));

  return [...front, ...right, ...back, ...left, ...bottom];
};

