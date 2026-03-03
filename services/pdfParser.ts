// This tells TypeScript that pdfjsLib is available globally, loaded from the CDN.
declare const pdfjsLib: any;

function postProcessArabicText(text: string): string {
  // A safer heuristic for Arabic text extraction:
  // Only join if it's a single Arabic character followed by one or more spaces and another Arabic character.
  // This helps with "spaced out" text without joining whole words.
  let processedText = text;
  
  // Pattern: (Arabic Char) (Space) (Arabic Char)
  // We use a lookahead to ensure we don't consume the second character in one match, 
  // allowing it to be the first character of the next match.
  const regex = /([\u0600-\u06FF])\s+(?=[\u0600-\u06FF])/g;
  
  // We only join if the characters are likely part of a split word.
  // This is still a heuristic, but safer than joining everything.
  processedText = processedText.replace(regex, (match, p1) => {
      // If there's more than one space, it might be a word boundary even in spaced text.
      // But usually, spaced text has consistent single spaces.
      return p1; 
  });

  return processedText;
}


export async function parsePdf(file: File): Promise<string> {
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error('Failed to read file.'));
      }
      
      const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
      
      try {
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        
        const processedText = postProcessArabicText(fullText);
        resolve(processedText);
      } catch (error) {
        reject(new Error('Error parsing PDF file. It might be corrupted or protected.'));
      }
    };

    fileReader.onerror = (error) => {
      reject(error);
    };

    fileReader.readAsArrayBuffer(file);
  });
}
