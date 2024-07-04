import * as ti from "taichi.js";

export const computeRayDirection = (theta: number, alpha: number) => {
  const x = ti.cos(theta) * ti.cos(alpha);
  const y = ti.cos(theta) * ti.sin(alpha);
  const z = ti.sin(theta);
  return [x, y, z];
};

export const getRayForAngle = (verticalResolution, horisontalResolution, i, j): ti.Vector => {
  const verticalStep = 3.14159265359 / 2 / verticalResolution;
  const horizontalStep = (3.14159265359 * 2) / horisontalResolution;

  const theta = i * verticalStep;
  const alpha = j * horizontalStep;
  return computeRayDirection(theta, alpha);
};

export const getVscScoreAtAngle = (rayDirection, verticalStep, horizontalStep) => {
  const vscAtAngle = 1.0 + 2.0 * rayDirection[2];
  const deltaOmega = ti.norm(rayDirection.zy) * verticalStep * horizontalStep; // the area of the rectangle this ray covers on the unit sphere
  return vscAtAngle * deltaOmega;
};
