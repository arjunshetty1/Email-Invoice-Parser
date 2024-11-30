const tesseract = require('tesseract.js')
const pdfParse = require('pdf-parse')

class OCRService {
  async extractTextFromPDF(pdfBuffer) {
    try {
      const data = await pdfParse(pdfBuffer)
      return data.text
    } catch (error) {
      console.error(`Error extracting text from PDF: ${error.message}`)
      return ''
    }
  }

  async performOCR(imageBuffer) {
    try {
      const { data: { text } } = await tesseract.recognize(imageBuffer)
      return text
    } catch (error) {
      console.error(`Error performing OCR: ${error.message}`)
      return ''
    }
  }
}

module.exports = new OCRService()

