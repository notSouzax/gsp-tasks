import { useState, useEffect, useCallback, useRef } from 'react';

export const useVoiceInput = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);
    const silenceTimer = useRef(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = true; // Use continuous so it triggers silence timer instead of auto-stop
            recognitionInstance.interimResults = true; // Needed to detect "while speaking" events/silence
            recognitionInstance.lang = 'es-ES';

            recognitionInstance.onstart = () => {
                setIsRecording(true);
                setError(null);
                setTranscript('');

                // Start silence timer immediately (in case they don't say anything)
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
                silenceTimer.current = setTimeout(() => {
                    recognitionInstance.stop();
                }, 2000); // Reduced to 2s
            };

            recognitionInstance.onresult = (event) => {
                // Reset silence timer on every result (speech detected)
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
                silenceTimer.current = setTimeout(() => {
                    recognitionInstance.stop();
                }, 2000); // Reduced to 2s

                let fullTranscript = '';
                for (let i = 0; i < event.results.length; ++i) {
                    fullTranscript += event.results[i][0].transcript;
                }
                setTranscript(fullTranscript);
            };

            recognitionInstance.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                if (event.error !== 'no-speech') {
                    setError(event.error);
                }
                // Don't stop on 'no-speech', just let the timer handle it or ignore
                if (event.error !== 'no-speech') {
                    setIsRecording(false);
                }
            };

            recognitionInstance.onend = () => {
                setIsRecording(false);
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
            };

            recognitionRef.current = recognitionInstance;
        } else {
            setError('Browser not supported');
        }
    }, []);

    const startRecording = useCallback(() => {
        if (recognitionRef.current && !isRecording) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Failed to start recording:", e);
                setError("Failed to start recording");
            }
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
        }
    }, [isRecording]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    return {
        isRecording,
        transcript,
        error,
        startRecording,
        stopRecording,
        resetTranscript,
        isSupported: !!recognitionRef.current || ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    };
};
