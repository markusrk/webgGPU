import * as ti from "taichi.js";

export const rayIntersectsRectangle = (
    origin: ti.Vector,
    ray: ti.Vector,
    startRec: ti.Vector,
    endRec: ti.Vector
  ) => {
    let res = false;
    const planeTangentVec = (endRec - startRec) as ti.Vector;
    const planeNormVec = [planeTangentVec.y, -planeTangentVec.x,0] as ti.Vector;
    const dot = ti.dot(planeNormVec, ray);
    if (dot <= 0.00001) {
      const t2 =
        ti.dot(startRec - origin, planeNormVec) / ti.dot(ray, planeNormVec);
      const pointInPlane = origin + ray * t2;
      const isInside =
        ti.dot(startRec - pointInPlane, endRec - pointInPlane) <= 0;
      res = isInside && t2 > 0;
    }
    return res;
  };