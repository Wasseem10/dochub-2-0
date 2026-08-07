import openCvModule from "@techstark/opencv-js";

async function resolveOpenCv() {
  let cv = openCvModule?.cv || openCvModule;
  if (typeof cv?.then === "function") cv = await cv;
  if (typeof cv?.ready?.then === "function") await cv.ready;
  if (!cv?.Mat || !cv?.cvtColor || !cv?.equalizeHist) throw new Error("OpenCV.js did not initialize correctly.");
  return cv;
}

const openCvPromise = resolveOpenCv();

self.addEventListener("message", async (event) => {
  const { id, width, height, pixels } = event.data || {};
  try {
    const cv = await openCvPromise;
    const source = new cv.Mat(height, width, cv.CV_8UC4);
    const grayscale = new cv.Mat();
    const enhanced = new cv.Mat();
    const rgba = new cv.Mat();
    try {
      source.data.set(new Uint8ClampedArray(pixels));
      cv.cvtColor(source, grayscale, cv.COLOR_RGBA2GRAY);
      cv.equalizeHist(grayscale, enhanced);
      cv.cvtColor(enhanced, rgba, cv.COLOR_GRAY2RGBA);
      const output = new Uint8ClampedArray(rgba.data);
      self.postMessage({ id, width, height, pixels: output.buffer }, [output.buffer]);
    } finally {
      source.delete();
      grayscale.delete();
      enhanced.delete();
      rgba.delete();
    }
  } catch (error) {
    self.postMessage({ id, error: error?.message || "OpenCV.js could not preprocess this page." });
  }
});

