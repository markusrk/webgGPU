import * as ti from "taichi.js";

export const generateRay = ti.func(() => {
  return ti.normalized([ti.random()*2-1, ti.random()*2-1, ti.random()*2-1]) as ti.Vector;
});

export const generateRayFromNormal = ti.func((normal: ti.Vector<ti.f32>) => {
  let ray: ti.Vector<ti.f32> = [0.1, 0.1, 0.1];
  let rayCandidate: ti.Vector<ti.f32> = [1.2, 0.1, 0.1];
  while (ray[0] === 0.1 && ray[1] === 0.1 && ray[2] === 0.1) {
    rayCandidate = generateRay();
    if (ti.dot(rayCandidate, normal) > 0) {
      ray = rayCandidate;
    }
  }
  return ray;
});
