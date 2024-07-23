import * as ti from "taichi.js";
import { BinsTypeJS } from "./acceleration/binning";

export const rayIntersectsRectangle = ti.func(
  (origin: ti.Vector, ray: ti.Vector, startCorner: ti.Vector, endCorner: ti.Vector) => {
    let res = false;
    const corner1 = [startCorner.x, startCorner.y, endCorner.z] as ti.Vector;
    const corner2 = [endCorner.x, endCorner.y, startCorner.z] as ti.Vector;
    const planeNormVec = [-startCorner.y + endCorner.y, -endCorner.x + startCorner.x, 0] as ti.Vector;
    const dot = ti.dot(planeNormVec, ray);
    if (dot <= 0.00001) {
      const t = ti.dot(startCorner - origin, planeNormVec) / ti.dot(ray, planeNormVec);
      const rayPointInPlane = origin + ray * t;

      const vecRay = rayPointInPlane - startCorner;
      const vecCorner1 = corner1 - startCorner;
      const vecCorner2 = corner2 - startCorner;

      const projectionRayCorner1 = ti.dot(vecCorner1, vecRay) / ti.norm(vecCorner1);
      const projectionRayCorner2 = ti.dot(vecCorner2, vecRay) / ti.norm(vecCorner2);
      const rayPointBetweenCorners = projectionRayCorner1 >= 0 && projectionRayCorner2 >= 0;
      const rayPointinsideRectangle =
        projectionRayCorner1 <= ti.norm(vecCorner1) && projectionRayCorner2 <= ti.norm(vecCorner2);

      res = rayPointBetweenCorners && rayPointinsideRectangle;
    }
    return res;
  }
);

export const rayIntersectsTriangle = ti.func(
  (origin: ti.Vector, ray: ti.Vector, p1: ti.Vector, p2: ti.Vector, p3: ti.Vector) => {
    let intersects = false;
    const vec1 = p2 - p1;
    const vec2 = p3 - p2;
    const vec3 = p1 - p3;
    const normal = ti.cross(vec1, vec2);
    const dot = ti.dot(normal, ray);

    let t = ti.f32(0);
    let rayPointInPlane = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector<ti.f32>;

    if (dot <= -0.00001) {
      t = ti.dot(p1 - origin, normal) / ti.dot(ray, normal);
      rayPointInPlane = origin + ray * t;
      const cross1 = ti.cross(vec1, rayPointInPlane - p1);
      const cross2 = ti.cross(vec2, rayPointInPlane - p2);
      const cross3 = ti.cross(vec3, rayPointInPlane - p3);
      intersects = ti.dot(cross1, cross2) >= 0 && ti.dot(cross2, cross3) >= 0 && t > 0.00001;
    }
    return { intersects, intersectionPoint: rayPointInPlane, t, triangleNormal: normal };
  }
);

export const intersectRayWithGeometry = ti.func(
  (origin: ti.Vector, ray: ti.Vector, geometry: ti.field<ti.Vector>, geometryLength: number): ti.Vector => {
    let isHit = false;
    let intersectionPoint = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector;
    let t = ti.f32(1000000000);
    let triangleNormal = [ti.f32(0.0), ti.f32(0.0), ti.f32(0.0)] as ti.Vector;
    for (let i of ti.range(geometryLength)) {
      // @ts-ignore
      let res = rayIntersectsTriangle(origin, ray, geometry[(i, 0)], geometry[(i, 1)], geometry[(i, 2)]);
      if (res.intersects && res.t < t && res.t > 0.00001) {
        isHit = true;
        intersectionPoint = res.intersectionPoint;
        t = res.t;
        triangleNormal = res.triangleNormal;
      }
    }
    return { isHit, intersectionPoint, triangleNormal, t, reflectivity: ti.f32(options.materialReflectivity) };
  }
);

export const intersectRayWithBin = ti.func((origin: ti.Vector, ray: ti.Vector, bin: BinsTypeJS): ti.Vector => {
  const tx1 = (bin.xMin - origin[0]) / ray[0];
  const tx2 = (bin.xMax - origin[0]) / ray[0];

  const ty1 = (bin.yMin - origin[1]) / ray[1];
  const ty2 = (bin.yMax - origin[1]) / ray[1];

  const tz1 = (bin.zMin - origin[2]) / ray[2];
  const tz2 = (bin.zMax - origin[2]) / ray[2];

  const tmin = ti.max(ti.max(ti.min(tx1, tx2), ti.min(ty1, ty2)),ti.min(tz1, tz2));
  const tmax = ti.min(ti.min(ti.max(tx1, tx2), ti.max(ty1, ty2)),ti.max(tz1, tz2));
  return tmax >= tmin && tmax >= 0;
});
