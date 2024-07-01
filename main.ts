import * as ti from "taichi.js"

let main = async () => {
    await ti.init();

    let n = 200;
    let pixels = ti.Vector.field(3, ti.f32, [n, n]) as ti.Field;
    
    
    
    ti.addToKernelScope({ pixels, n });
    
    const kernel = ti.kernel((time: number) => {  
        const isInside = (i: number, j: number) => {
            let bool = true
            if (i < 0 || i >= n || j < 0 || j >= n/2) {
                bool = false;
            }
            return bool
        }

        for (let i of ti.ndrange(n, n)) {
            let color = (1+ti.sin((i[0]+i[1]+time)/10));
            pixels[i][0] = isInside(i[0], i[1]);
            pixels[i][1] = (1+ti.cos((i[0]+i[1]+time)/10));
            pixels[i][2] = (1+ti.cos((i[0]-i[1]+time)/10));
        }
      }
    )




    const htmlCanvas = document.getElementById('result_canvas')! as ti.Canvas
    htmlCanvas.width = 2 * n;
    htmlCanvas.height = n;
    let canvas = new ti.Canvas(htmlCanvas);

    let i = 0;
    async function frame() {
        i = i + 1;
        kernel(i);
        canvas.setImage(pixels);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
};
main();