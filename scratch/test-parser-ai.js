function parseYoutubeTranscriptAi(text) {
  const lines = text.split('\n');
  const items = [];
  
  let lang = 'en';
  const langMatch = text.match(/Language:\s*([a-zA-Z\-]+)/);
  if (langMatch) {
    lang = langMatch[1];
  }

  for (const line of lines) {
    const match = line.match(/^\[(\d+):(\d+)(?::(\d+))?\]\s*(.*)$/);
    if (match) {
      const h_or_m = parseInt(match[1], 10);
      const m_or_s = parseInt(match[2], 10);
      const s = match[3] ? parseInt(match[3], 10) : undefined;
      
      let offsetMs = 0;
      if (s !== undefined) {
        const h = h_or_m;
        const m = m_or_s;
        offsetMs = ((h * 3600) + (m * 60) + s) * 1000;
      } else {
        const m = h_or_m;
        const sec = m_or_s;
        offsetMs = ((m * 60) + sec) * 1000;
      }

      items.push({
        offset: offsetMs,
        duration: 0,
        text: match[4].trim(),
        lang,
      });
    }
  }

  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    const next = items[i + 1];
    if (next) {
      current.duration = next.offset - current.offset;
    } else {
      current.duration = 5000; // default 5s
    }
  }

  return items;
}

async function run() {
  const videoId = '_y_joEiu6Ak';
  const url = `https://youtube-transcript.ai/transcript/${videoId}.txt`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log('HTTP Error:', res.status);
      return;
    }
    const body = await res.text();
    const items = parseYoutubeTranscriptAi(body);
    console.log(`Parsed ${items.length} segments.`);
    console.log('First 3 segments:', items.slice(0, 3));
    console.log('Last segment:', items[items.length - 1]);
  } catch (err) {
    console.error(err);
  }
}

run();
