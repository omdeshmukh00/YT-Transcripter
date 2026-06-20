function parseAvailableLanguages(text) {
  const match = text.match(/Other available languages:\s*(.*)/);
  if (!match) return [];
  
  const langsStr = match[1];
  const parts = langsStr.split(',').map(p => p.trim());
  
  const langNames = {
    en: 'English',
    hi: 'Hindi',
    mr: 'Marathi',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    zh: 'Chinese',
    ru: 'Russian',
    pt: 'Portuguese',
    pa: 'Punjabi',
    it: 'Italian',
    ko: 'Korean',
    vi: 'Vietnamese',
    ar: 'Arabic',
    tr: 'Turkish',
    nl: 'Dutch',
    pl: 'Polish',
    sv: 'Swedish',
    id: 'Indonesian',
  };

  const available = [];
  
  for (const part of parts) {
    const itemMatch = part.match(/^([a-zA-Z0-9\-]+)(?:\s*\(([^)]+)\))?(?:\s*\[([^\]]+)\])?$/);
    if (itemMatch) {
      const code = itemMatch[1];
      const standardCode = itemMatch[2] || code;
      const isAuto = itemMatch[3] === 'auto';
      
      const baseCode = standardCode.split('-')[0].toLowerCase();
      let name = langNames[baseCode] || baseCode.toUpperCase();
      if (isAuto) {
        name += ' (Auto)';
      }
      
      available.push({ code, name });
    }
  }
  
  return available;
}

const testStr = `Other available languages: a-en (en) [auto], de-DE (de-DE), ja (ja), pt-BR (pt-BR), es-419 (es-419)`;
console.log(parseAvailableLanguages(testStr));
