import * as ti from "taichi.js";

export const initRandomVertices = async (triangleCount: number, scale: number) => {
  const vertices = ti.Vector.field(3, ti.f32, [triangleCount * 3]) as ti.field;
  const indices = ti.Vector.field(3, ti.i32, [triangleCount]) as ti.field;

  ti.addToKernelScope({ vertices, indices, triangleCount });

  const kernel = ti.kernel((scale) => {
    const scaleZ = 50;
    const smallScale = 10;
    for (let i of ti.range(triangleCount)) {
      const step = i * 3;
      vertices[step] = [ti.random() * scale, ti.random() * scale, ti.random() * scaleZ];
      vertices[step + 2] = vertices[step] + [(ti.random() - 0.5) * smallScale, 0, (ti.random() - 0.5) * smallScale];
      vertices[step + 1] = vertices[step] + [0, (ti.random() - 0.5) * smallScale, (ti.random() - 0.5) * smallScale];
      indices[i] = [step, step + 1, step + 2];
    }
  });

  kernel(scale);

  return { vertices, indices };
};
