import * as ti from "taichi.js";
import { Triangle } from "./example/geometryBuilder";

export const loadPolygon = (polygonInJS: [number, number][]) => {
  const polygonLength = polygonInJS.length;
  const polygon = ti.Vector.field(2, ti.f32, [polygonLength]) as ti.Field;
  polygon.fromArray(polygonInJS);

  ti.addToKernelScope({ polygon, polygonLength });
  return { polygon, polygonLength };
};

export const loadTriangle = (trianglesInJS: Triangle[]) => {
  const triangleLength = trianglesInJS.length;
  const triangles = ti.Vector.field(3, ti.f32, [triangleLength, 3]);

  triangles.fromArray(trianglesInJS);
  ti.addToKernelScope({ triangles });
  return { triangles, triangleLength };
};
