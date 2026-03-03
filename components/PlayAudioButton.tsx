import React, { useState, useCallback, useEffect } from 'react';
import { generateSpeech } from '../services/geminiService';
import { playAudio, stopAudio } from '../utils/audio';
import { SpeakerIcon, LoaderIcon, StopCircleIcon } from './Icons';

interface PlayAudioButtonProps {
  textToSpeak: string;
}

export const PlayAudioButton: React.FC<PlayAudioButtonProps> = ({ textToSpeak }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');

  const handlePlay = useCallback(async () => {
    if (status === 'playing') {
        stopAudio();
        setStatus('idle');
        return;
    }
    
    // Stop any other audio that might be playing before starting a new one
    stopAudio();

    setStatus('loading');
    try {
      if(!textToSpeak || textToSpeak.trim() === '') {
        throw new Error("Text to speak is empty");
      }
      const audioData = await generateSpeech(textToSpeak);
      setStatus('playing');
      await playAudio(audioData);
      setStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [textToSpeak, status]);

  // Cleanup effect to stop audio if the component unmounts while playing
  useEffect(() => {
    return () => {
      if (status === 'playing') {
        stopAudio();
      }
    };
  }, [status]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <LoaderIcon className="w-5 h-5 animate-spin" />;
      case 'playing':
        return <StopCircleIcon className="w-5 h-5 text-red-500" />;
      case 'error':
        return <SpeakerIcon className="w-5 h-5 text-red-500" />;
      case 'idle':
      default:
        return <SpeakerIcon className="w-5 h-5" />;
    }
  };
  
  const getTitle = () => {
    switch (status) {
        case 'loading': return 'جاري التحميل...';
        case 'playing': return 'إيقاف الصوت';
        default: return 'استمع إلى النص';
    }
  }

  if (!textToSpeak) return null;

  return (
    <button
      onClick={handlePlay}
      title={getTitle()}
      disabled={status === 'loading'}
      className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
    >
      {getIcon()}
    </button>
  );
};
