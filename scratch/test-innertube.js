const videoId = '_y_joEiu6Ak';

async function testClient(clientName, clientVersion, hl = 'en', gl = 'IN') {
  let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  if (clientName === 'ANDROID') {
    userAgent = `com.google.android.youtube/${clientVersion} (Linux; U; Android 14)`;
  } else if (clientName === 'IOS') {
    userAgent = `com.google.ios.youtube/${clientVersion} (iPhone; U; CPU iPhone OS 17_5 like Mac OS X; en_US)`;
  }

  const payload = {
    context: {
      client: {
        clientName,
        clientVersion,
        hl,
        gl,
      }
    },
    videoId,
  };

  if (clientName === 'ANDROID') {
    payload.context.client.androidSdkVersion = 35;
    payload.context.client.userAgent = userAgent;
  }

  console.log(`Testing client: ${clientName} (${clientVersion})...`);
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.log(`❌ ${clientName} failed with HTTP status ${res.status}`);
      return false;
    }

    const data = await res.json();
    const captionTracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (captionTracks.length > 0) {
      console.log(`✅ ${clientName} succeeded! Found ${captionTracks.length} caption tracks.`);
      captionTracks.forEach(t => console.log(`  - [${t.languageCode}] ${t.baseUrl.substring(0, 60)}...`));
      return true;
    } else {
      console.log(`⚠️ ${clientName} returned no caption tracks. Playback status: ${data.playabilityStatus?.status || 'Unknown'}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ ${clientName} error:`, err.message);
    return false;
  }
}

async function run() {
  const clients = [
    { name: 'ANDROID', version: '20.10.38' },
    { name: 'IOS', version: '19.29.1' },
    { name: 'WEB_EMBEDDED_PLAYER', version: '1.20240222.01.00' },
    { name: 'MWEB', version: '2.20240222.01.00' },
    { name: 'TVHTML5', version: '7.20240222.01.00' },
    { name: 'WEB', version: '2.20240222.01.00' },
  ];

  for (const client of clients) {
    await testClient(client.name, client.version);
    console.log('-'.repeat(50));
  }
}

run();
