import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

// Voice recorder: records audio, uploads it privately, transcribes via backend
// function, then calls onTranscript(text). Files are stored privately — no
// public URL, so access follows your app's permissions.
export default function VoiceRecorder({ onTranscript, disabled }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) return null;

  const stop = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        try {
          setBusy(true);
          const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
          const res = await base44.functions.invoke("transcribeVoice", { file_uri });
          const transcript = res?.data?.transcript || "";
          if (transcript) onTranscript(transcript);
        } catch (e) {
          alert("Could not transcribe voice: " + (e?.message || e));
        } finally {
          setBusy(false);
        }
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      alert("Microphone access failed: " + (e?.message || e));
    }
  };

  const toggle = recording ? stop : start;

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "outline"}
      size="icon"
      onClick={toggle}
      disabled={disabled}
      title={recording ? "Stop recording" : "Record a voice message"}
    >
      {recording ? (
        <Square className="h-4 w-4" />
      ) : busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}