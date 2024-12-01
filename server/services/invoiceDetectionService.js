exports.detectInvoice = async (text) => {
  const keywords = ['invoice', 'bill', 'payment', 'due date', 'amount due', 'total', 'tax', 'subtotal'];
  const lowercaseText = text.toLowerCase();
  return keywords.some(keyword => lowercaseText.includes(keyword));
};

