import * as ti from "taichi.js";


export const interpolateColors = (color1: ti.Vector, color2: ti.Vector, a: number): ti.Vector => {
  return ;
};

export const getColorForScore = (score: ti.f32, colorPallet: ti.Field<ti.Vector>, colorPalletLength: number) => {
  let index = 0;
  for (let i of ti.range(colorPalletLength)) {
    if (score > colorPallet[i][3]) {
      index = i;
    }
  }
  const maxScore = colorPallet[index + 1][3];
  const minScore = colorPallet[index][3];
  const a = (score - minScore) / (maxScore - minScore);
  // return [0,255,2]
  return colorPallet[index].rgb* (1 - a) + colorPallet[index + 1].rgb * a;
};
