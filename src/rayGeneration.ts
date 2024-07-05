import * as ti from "taichi.js";

export const computeRayDirection = (theta: number, alpha: number) => {
  const x = ti.cos(theta) * ti.cos(alpha);
  const y = ti.cos(theta) * ti.sin(alpha);
  const z = ti.sin(theta);
  return ti.normalized([x, y, z]);
};

export const getRayForAngle = (verticalStep, horizontalStep, i, j): ti.Vector => {
  //todo add a 0.5 offset here as we want to start halfway through the pixel
  const theta = i * verticalStep;
  const alpha = j * horizontalStep;
  return computeRayDirection(theta, alpha);
};

export const getVscScoreAtAngle = (rayDirection, verticalStep, horizontalStep) => {
  const vscAtAngle = 1.0 + 2.0 * rayDirection[2];
  const deltaOmega = ti.norm(rayDirection.xy) * verticalStep * horizontalStep; // the area of the rectangle this ray covers on the unit sphere
  return vscAtAngle * deltaOmega;
};
