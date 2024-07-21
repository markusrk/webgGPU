import * as ti from "taichi.js";

// todo: Currently, this function forces the score to zero for downward rays. It is not given that this is the correct behavior.
export const getSpecificVCSScoreAtRay = ti.func((ray: ti.Vector) => {
  let res = 1.0 + 2.0 * ray[2];
  if (ray[2] <= 0) {
    res = 0;
  }
  return res
});
