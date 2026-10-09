// Transcribe a voice message (uploaded as a private file) to text using Whisper.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_uri } = body;
    if (!file_uri) return Response.json({ error: 'file_uri required' }, { status: 400 });

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri, expires_in: 600
    });

    const result = await base44.asServiceRole.integrations.Core.TranscribeAudio({
      audio_url: signed_url
    });

    const transcript = typeof result === "string" ? result : (result?.text || "");
    return Response.json({ transcript });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}