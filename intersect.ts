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
      const t =
        ti.dot(startRec - origin, planeNormVec) / ti.dot(ray, planeNormVec);
      const rayPointInPlane = origin + ray * t;     
    
      const isInside =
        ti.dot(startRec - rayPointInPlane, endRec - rayPointInPlane) <= 0;
      res = isInside && t > 0;
    }
    return res;
  };