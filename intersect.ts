import * as ti from "taichi.js";

export const rayIntersectsRectangle = (
  origin: ti.Vector,
  ray: ti.Vector,
  startCorner: ti.Vector,
  endCorner: ti.Vector
) => {
  let res = false;
  const corner1 = [startCorner.x, startCorner.y, endCorner.z] as ti.Vector;
  const corner2 = [endCorner.x, endCorner.y, startCorner.z] as ti.Vector;
  const planeNormVec = [
    -startCorner.y + endCorner.y,
    -endCorner.x + startCorner.x,
    0,
  ] as ti.Vector;
  const dot = ti.dot(planeNormVec, ray);
  if (dot <= 0.00001) {
    const t =
      ti.dot(startCorner - origin, planeNormVec) / ti.dot(ray, planeNormVec);
    const rayPointInPlane = origin + ray * t;

    const vecRay = rayPointInPlane - startCorner;
    const vecCorner1 = corner1 - startCorner;
    const vecCorner2 = corner2 - startCorner;

    const projectionRayCorner1 = ti.dot(vecCorner1, vecRay)/ti.norm(vecCorner1);
    const projectionRayCorner2 = ti.dot(vecCorner2, vecRay)/ti.norm(vecCorner2);
    const rayPointBetweenCorners = projectionRayCorner1 >= 0 && projectionRayCorner2 >= 0
    const rayPointinsideRectangle = projectionRayCorner1 <= ti.norm(vecCorner1) && projectionRayCorner2 <= ti.norm(vecCorner2);

    res = rayPointBetweenCorners && rayPointinsideRectangle
  }
  return res;
};
