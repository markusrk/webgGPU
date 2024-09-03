import * as ti from "taichi.js";
import { Triangle } from "./example/geometryBuilder";
const MAX_POLYGON_LENGTH = 100;
const polygon = ti.Vector.field(2, ti.f32, [MAX_POLYGON_LENGTH]) as ti.Field;

export const initPolygon = async () => { 
  const zerosArray: number[][] = Array.from({ length: MAX_POLYGON_LENGTH }, () => [0, 0]);
  await polygon.fromArray(zerosArray);
  ti.addToKernelScope({ polygon});
}

export const loadPolygon = async (polygonInJS: [number, number][]) => {
  const polygonLength = polygonInJS.length;
  if (polygonLength > MAX_POLYGON_LENGTH) {
    throw new Error(`The maximum number of points in a polygon is ${MAX_POLYGON_LENGTH}, just adjust this max to whatever you need. It will slightly affect performance.`);
  }
  const paddedPolygon = [...polygonInJS, ...Array.from({ length: MAX_POLYGON_LENGTH - polygonInJS.length }, () => [0, 0])];
  await polygon.fromArray(paddedPolygon);
  
  return polygonLength;
};
const MAX_TRIANGLE_LENGTH = 400; 
const triangles = ti.Vector.field(3, ti.f32, [MAX_TRIANGLE_LENGTH, 3]);

export const initTriangle = async () => {
  const zerosArray: number[][] = Array.from({ length: MAX_TRIANGLE_LENGTH }, () => [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  await triangles.fromArray(zerosArray);
  ti.addToKernelScope({ triangles });
  
}

export const loadTriangle = async (trianglesInJS: Triangle[]) => {
  const triangleLength = trianglesInJS.length;
  if (triangleLength > MAX_TRIANGLE_LENGTH) {
    throw new Error(`The maximum number of triangles is ${MAX_TRIANGLE_LENGTH}, just adjust this max to whatever you need. It will slightly affect performance.`);
  }
  const paddedTriangles = trianglesInJS.map(triangle => triangle.map(point => [...point])).concat(Array.from({ length: MAX_TRIANGLE_LENGTH - trianglesInJS.length }, () => [[0, 0, 0], [0, 0, 0], [0, 0, 0]]));
  await triangles.fromArray(paddedTriangles);
  return  triangleLength;
};
