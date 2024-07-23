import * as ti from "taichi.js";

export const initRandomVertices = async (triangleCount: number) => {
  const vertices = ti.Vector.field(3, ti.f32, [triangleCount * 3]) as ti.field;
  const indices = ti.Vector.field(3, ti.i32, [triangleCount]) as ti.field;

  ti.addToKernelScope({ vertices, indices, triangleCount });

  const kernel = ti.kernel(() => {
    const scale = 1000;
    const smallScale = 10;
    for (let i of ti.range(triangleCount)) {
      const step = i * 3;
      vertices[step] = [ti.random() * scale, ti.random() * scale, ti.random() * scale];
      vertices[step + 1] = vertices[step] + [ti.max(ti.random(), 0.1) * smallScale, 0, 0];
      vertices[step + 2] = vertices[step] + [0, ti.max(ti.random(), 0.1) * smallScale, 0];
      indices[i] = [step, step + 1, step + 2];
    }
  });

  kernel();

  return { vertices, indices };
};
