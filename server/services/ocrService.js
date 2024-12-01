const tesseract = require("tesseract.js");
const { createWorker } = tesseract;

class OCRService {
  constructor() {
    this.worker = null;
  }

  async initWorker() {
    if (!this.worker) {
      this.worker = await createWorker();
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
    }
  }

  async performOCR(imagePath) {
    try {
      await this.initWorker();
      const { data: { text } } = await this.worker.recognize(imagePath);
      return text;
    } catch (error) {
      console.error(`Error performing OCR: ${error.message}`);
      return "";
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

module.exports = new OCRService();

