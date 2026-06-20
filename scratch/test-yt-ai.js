const videoId = '_y_joEiu6Ak';

async function run() {
  const url = `https://youtube-transcript.ai/transcript/${videoId}.txt`;
  console.log(`Fetching from: ${url}...`);
  try {
    const res = await fetch(url);
    console.log(`HTTP Status: ${res.status}`);
    if (!res.ok) {
      const text = await res.text();
      console.log(`Error Response:`, text);
      return;
    }
    const text = await res.text();
    console.log(`Success! First 500 characters of response:`);
    console.log(text.substring(0, 500));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
