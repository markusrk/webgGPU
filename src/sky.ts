import * as ti from "taichi.js";

export const getSpecificVCSScoreAtRay = ti.func((ray: ti.Vector) => {
  return 1.0 + 2.0 * ray[2];
});
