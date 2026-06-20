const videoId = 'dQw4w9WgXcQ';

async function run() {
  const url = `https://youtube-transcript.ai/transcript/${videoId}.txt`;
  console.log(`Fetching: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log('HTTP Error:', res.status);
      return;
    }
    const text = await res.text();
    // Print lines before "## Transcript"
    const lines = text.split('\n');
    const headerLines = [];
    for (const line of lines) {
      if (line.trim() === '## Transcript') {
        break;
      }
      headerLines.push(line);
    }
    console.log('Header:');
    console.log(headerLines.join('\n'));
  } catch (err) {
    console.error(err);
  }
}

run();
